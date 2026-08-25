package com.enacademy.commerce;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class CommerceRepository {
    public record ProductRow(UUID id,String slug,String type,String titleEn,String titleFa,String descriptionEn,
                             String descriptionFa,String previewEn,String previewFa,long priceToman,String targetKey,
                             String downloadResource,String badge,boolean active,boolean purchased,Instant updatedAt) {}
    public record OrderRow(UUID id,String status,long subtotalToman,long totalToman,Instant createdAt,
                           UUID invoiceId,String invoiceNumber) {}
    public record OrderItemRow(UUID productId,String productType,String titleEn,String titleFa,int quantity,
                               long unitPriceToman,long lineTotalToman) {}
    public record AdminOrderRow(UUID id,String buyerName,String buyerEmail,String status,long totalToman,
                                Instant createdAt,UUID invoiceId,String invoiceNumber) {}
    public record InvoiceRow(UUID invoiceId,String invoiceNumber,Instant issuedAt,UUID orderId,String status,
                             long subtotalToman,long totalToman,String buyerName,String buyerEmail,
                             List<OrderItemRow> items) {}

    private final JdbcClient jdbc;
    public CommerceRepository(JdbcClient jdbc){this.jdbc=jdbc;}

    public List<ProductRow> activeProducts(UUID userId) {
        return jdbc.sql("""
            SELECT p.*, EXISTS(
              SELECT 1 FROM product_entitlements e WHERE e.product_id=p.id AND e.user_id=:user
            ) purchased
            FROM products p WHERE p.active=true
            ORDER BY CASE p.product_type WHEN 'COURSE' THEN 0 ELSE 1 END,p.price_toman
            """).param("user",userId).query(this::mapProduct).list();
    }

    public List<ProductRow> allProducts() {
        return jdbc.sql("SELECT p.*,false purchased FROM products p ORDER BY product_type,created_at")
            .query(this::mapProduct).list();
    }

    public List<ProductRow> activeProductsByIds(List<UUID> ids) {
        return jdbc.sql("SELECT p.*,false purchased FROM products p WHERE p.active=true AND p.id IN (:ids)")
            .param("ids",ids).query(this::mapProduct).list();
    }

    public Optional<ProductRow> product(UUID id) {
        return jdbc.sql("SELECT p.*,false purchased FROM products p WHERE p.id=:id")
            .param("id",id).query(this::mapProduct).optional();
    }

    public boolean hasEntitlement(UUID userId,UUID productId) {
        return jdbc.sql("SELECT EXISTS(SELECT 1 FROM product_entitlements WHERE user_id=:user AND product_id=:product)")
            .param("user",userId).param("product",productId).query(Boolean.class).single();
    }

    public void insertOrder(UUID id,UUID userId,long total) {
        jdbc.sql("""
            INSERT INTO purchase_orders(id,user_id,status,currency,subtotal_toman,total_toman)
            VALUES(:id,:user,'APPROVED','TOMAN',:total,:total)
            """).param("id",id).param("user",userId).param("total",total).update();
    }

    public void insertItem(UUID orderId,ProductRow product) {
        jdbc.sql("""
            INSERT INTO purchase_order_items(
              id,order_id,product_id,product_type,title_en,title_fa,quantity,unit_price_toman,line_total_toman
            ) VALUES(:id,:order,:product,:type,:titleEn,:titleFa,1,:price,:price)
            """).param("id",UUID.randomUUID()).param("order",orderId).param("product",product.id())
            .param("type",product.type()).param("titleEn",product.titleEn()).param("titleFa",product.titleFa())
            .param("price",product.priceToman()).update();
    }

    public String nextInvoiceNumber() {
        long sequence=jdbc.sql("SELECT nextval('enacademy_invoice_number_seq')").query(Long.class).single();
        return "ENA-"+String.format("%06d",sequence);
    }

    public UUID insertInvoice(UUID orderId,String number) {
        UUID id=UUID.randomUUID();
        jdbc.sql("INSERT INTO invoices(id,order_id,invoice_number) VALUES(:id,:order,:number)")
            .param("id",id).param("order",orderId).param("number",number).update();
        return id;
    }

    public void grant(UUID userId,UUID productId,UUID orderId) {
        jdbc.sql("""
            INSERT INTO product_entitlements(id,user_id,product_id,granted_by_order_id)
            VALUES(:id,:user,:product,:order)
            """).param("id",UUID.randomUUID()).param("user",userId).param("product",productId)
            .param("order",orderId).update();
    }

    public List<OrderRow> ordersForUser(UUID userId) {
        return jdbc.sql("""
            SELECT o.*,i.id invoice_id,i.invoice_number
            FROM purchase_orders o JOIN invoices i ON i.order_id=o.id
            WHERE o.user_id=:user ORDER BY o.created_at DESC
            """).param("user",userId).query((rs,row)->new OrderRow(
                rs.getObject("id",UUID.class),rs.getString("status"),rs.getLong("subtotal_toman"),
                rs.getLong("total_toman"),rs.getTimestamp("created_at").toInstant(),
                rs.getObject("invoice_id",UUID.class),rs.getString("invoice_number"))).list();
    }

    public Optional<OrderRow> orderForUser(UUID userId,UUID orderId) {
        return jdbc.sql("""
            SELECT o.*,i.id invoice_id,i.invoice_number
            FROM purchase_orders o JOIN invoices i ON i.order_id=o.id
            WHERE o.user_id=:user AND o.id=:order
            """).param("user",userId).param("order",orderId).query((rs,row)->new OrderRow(
                rs.getObject("id",UUID.class),rs.getString("status"),rs.getLong("subtotal_toman"),
                rs.getLong("total_toman"),rs.getTimestamp("created_at").toInstant(),
                rs.getObject("invoice_id",UUID.class),rs.getString("invoice_number"))).optional();
    }

    public List<OrderItemRow> items(UUID orderId) {
        return jdbc.sql("SELECT * FROM purchase_order_items WHERE order_id=:order ORDER BY id")
            .param("order",orderId).query((rs,row)->new OrderItemRow(
                rs.getObject("product_id",UUID.class),rs.getString("product_type"),rs.getString("title_en"),
                rs.getString("title_fa"),rs.getInt("quantity"),rs.getLong("unit_price_toman"),
                rs.getLong("line_total_toman"))).list();
    }

    public Optional<InvoiceRow> invoiceForUser(UUID userId,UUID invoiceId) {
        return invoiceQuery("WHERE i.id=:invoice AND o.user_id=:user")
            .param("invoice",invoiceId).param("user",userId).query((rs,row)->mapInvoice(rs)).optional();
    }

    public Optional<InvoiceRow> invoiceForAdmin(UUID invoiceId) {
        return invoiceQuery("WHERE i.id=:invoice").param("invoice",invoiceId)
            .query((rs,row)->mapInvoice(rs)).optional();
    }

    private JdbcClient.StatementSpec invoiceQuery(String where) {
        return jdbc.sql("""
            SELECT i.id invoice_id,i.invoice_number,i.issued_at,o.id order_id,o.status,
                   o.subtotal_toman,o.total_toman,u.full_name buyer_name,u.email buyer_email
            FROM invoices i
            JOIN purchase_orders o ON o.id=i.order_id
            JOIN users u ON u.id=o.user_id
            """+where);
    }

    private InvoiceRow mapInvoice(java.sql.ResultSet rs) throws java.sql.SQLException {
        UUID orderId=rs.getObject("order_id",UUID.class);
        return new InvoiceRow(rs.getObject("invoice_id",UUID.class),rs.getString("invoice_number"),
            rs.getTimestamp("issued_at").toInstant(),orderId,rs.getString("status"),
            rs.getLong("subtotal_toman"),rs.getLong("total_toman"),rs.getString("buyer_name"),
            rs.getString("buyer_email"),items(orderId));
    }

    public Optional<ProductRow> entitledBook(UUID userId,UUID productId) {
        return jdbc.sql("""
            SELECT p.*,true purchased FROM products p
            JOIN product_entitlements e ON e.product_id=p.id
            WHERE e.user_id=:user AND p.id=:product AND p.product_type='BOOK' AND p.active=true
            """).param("user",userId).param("product",productId).query(this::mapProduct).optional();
    }

    public List<String> unlockedCourseLevels(UUID userId) {
        return jdbc.sql("""
            SELECT DISTINCT p.target_key FROM products p
            JOIN product_entitlements e ON e.product_id=p.id
            WHERE e.user_id=:user AND p.product_type='COURSE'
            ORDER BY p.target_key
            """).param("user",userId).query(String.class).list();
    }

    public long orderCount(){return jdbc.sql("SELECT count(*) FROM purchase_orders").query(Long.class).single();}
    public long approvedRevenue(){return jdbc.sql("SELECT coalesce(sum(total_toman),0) FROM purchase_orders WHERE status='APPROVED'").query(Long.class).single();}
    public long entitlementCount(){return jdbc.sql("SELECT count(*) FROM product_entitlements").query(Long.class).single();}

    public List<AdminOrderRow> recentOrders() {
        return jdbc.sql("""
            SELECT o.id,u.full_name buyer_name,u.email buyer_email,o.status,o.total_toman,o.created_at,
                   i.id invoice_id,i.invoice_number
            FROM purchase_orders o JOIN users u ON u.id=o.user_id JOIN invoices i ON i.order_id=o.id
            ORDER BY o.created_at DESC LIMIT 100
            """).query((rs,row)->new AdminOrderRow(rs.getObject("id",UUID.class),rs.getString("buyer_name"),
                rs.getString("buyer_email"),rs.getString("status"),rs.getLong("total_toman"),
                rs.getTimestamp("created_at").toInstant(),rs.getObject("invoice_id",UUID.class),
                rs.getString("invoice_number"))).list();
    }

    public void updateProduct(UUID productId,long priceToman,boolean active) {
        jdbc.sql("UPDATE products SET price_toman=:price,active=:active,updated_at=now() WHERE id=:id")
            .param("price",priceToman).param("active",active).param("id",productId).update();
    }

    private ProductRow mapProduct(java.sql.ResultSet rs,int row) throws java.sql.SQLException {
        return new ProductRow(rs.getObject("id",UUID.class),rs.getString("slug"),rs.getString("product_type"),
            rs.getString("title_en"),rs.getString("title_fa"),rs.getString("description_en"),
            rs.getString("description_fa"),rs.getString("preview_en"),rs.getString("preview_fa"),
            rs.getLong("price_toman"),rs.getString("target_key"),rs.getString("download_resource"),
            rs.getString("badge"),rs.getBoolean("active"),rs.getBoolean("purchased"),
            rs.getTimestamp("updated_at").toInstant());
    }
}
