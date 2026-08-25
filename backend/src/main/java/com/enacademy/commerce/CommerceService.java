package com.enacademy.commerce;

import com.enacademy.auth.AuthService;
import com.enacademy.domain.Role;
import com.enacademy.domain.UserAccount;
import com.enacademy.shared.ApiException;
import com.enacademy.shared.AuditService;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CommerceService {
    public record ProductView(UUID id,String slug,String type,String titleEn,String titleFa,String descriptionEn,
                              String descriptionFa,String previewEn,String previewFa,long priceToman,String targetKey,
                              String badge,boolean active,boolean purchased) {
        static ProductView from(CommerceRepository.ProductRow product) {
            return new ProductView(product.id(),product.slug(),product.type(),product.titleEn(),product.titleFa(),
                product.descriptionEn(),product.descriptionFa(),product.previewEn(),product.previewFa(),
                product.priceToman(),product.targetKey(),product.badge(),product.active(),product.purchased());
        }
    }
    public record CheckoutRequest(@NotEmpty @Size(max=10) List<UUID> productIds) {}
    public record PurchaseItemView(UUID productId,String productType,String titleEn,String titleFa,int quantity,
                                   long unitPriceToman,long lineTotalToman) {
        static PurchaseItemView from(CommerceRepository.OrderItemRow item) {
            return new PurchaseItemView(item.productId(),item.productType(),item.titleEn(),item.titleFa(),
                item.quantity(),item.unitPriceToman(),item.lineTotalToman());
        }
    }
    public record PurchaseView(UUID id,String status,long subtotalToman,long totalToman,String currency,
                               String createdAt,UUID invoiceId,String invoiceNumber,List<PurchaseItemView> items) {}
    public record AdminMetrics(long products,long orders,long approvedRevenueToman,long entitlements) {}
    public record AdminOrderView(UUID id,String buyerName,String buyerEmail,String status,long totalToman,
                                 String createdAt,UUID invoiceId,String invoiceNumber) {}
    public record AdminOverview(AdminMetrics metrics,List<ProductView> products,List<AdminOrderView> orders) {}
    public record AdminProductRequest(@Min(0) long priceToman,boolean active) {}
    public record BookDownload(String filename,Resource resource) {}

    private final CommerceRepository commerce;
    private final AuthService auth;
    private final AuditService audit;
    private final InvoicePdfService invoices;

    public CommerceService(CommerceRepository commerce,AuthService auth,AuditService audit,InvoicePdfService invoices) {
        this.commerce=commerce;this.auth=auth;this.audit=audit;this.invoices=invoices;
    }

    public List<ProductView> products(String subject) {
        var user=requireApprovedStudent(subject);
        return commerce.activeProducts(user.id()).stream().map(ProductView::from).toList();
    }

    @Transactional
    public PurchaseView checkout(String subject,CheckoutRequest request) {
        var user=requireApprovedStudent(subject);
        var requested=new LinkedHashSet<>(request.productIds());
        var products=commerce.activeProductsByIds(requested.stream().toList());
        if(products.size()!=requested.size()) {
            throw new ApiException(HttpStatus.BAD_REQUEST,"PRODUCT_UNAVAILABLE","One or more products are unavailable.");
        }
        for(var product:products) {
            if(commerce.hasEntitlement(user.id(),product.id())) {
                throw new ApiException(HttpStatus.CONFLICT,"ALREADY_PURCHASED","You already own one of these products.");
            }
        }
        long total=0;
        try {
            for(var product:products) total=Math.addExact(total,product.priceToman());
        } catch(ArithmeticException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST,"INVALID_TOTAL","The purchase total is invalid.");
        }

        UUID orderId=UUID.randomUUID();
        commerce.insertOrder(orderId,user.id(),total);
        for(var product:products) commerce.insertItem(orderId,product);
        String invoiceNumber=commerce.nextInvoiceNumber();
        UUID invoiceId=commerce.insertInvoice(orderId,invoiceNumber);
        for(var product:products) commerce.grant(user.id(),product.id(),orderId);
        audit.record(user.id(),"BETA_PURCHASE_APPROVED","PURCHASE_ORDER",orderId.toString(),
            Map.of("invoiceNumber",invoiceNumber,"totalToman",total,"products",products.size()));
        return purchase(user.id(),orderId);
    }

    public List<PurchaseView> purchases(String subject) {
        var user=requireApprovedStudent(subject);
        return commerce.ordersForUser(user.id()).stream().map(order->purchase(user.id(),order)).toList();
    }

    public byte[] invoicePdf(String subject,UUID invoiceId) {
        var user=requireApprovedStudent(subject);
        var invoice=commerce.invoiceForUser(user.id(),invoiceId).orElseThrow(()->
            new ApiException(HttpStatus.NOT_FOUND,"INVOICE_NOT_FOUND","Invoice not found."));
        return invoices.render(invoice);
    }

    public byte[] adminInvoicePdf(UUID invoiceId) {
        var invoice=commerce.invoiceForAdmin(invoiceId).orElseThrow(()->
            new ApiException(HttpStatus.NOT_FOUND,"INVOICE_NOT_FOUND","Invoice not found."));
        return invoices.render(invoice);
    }

    public BookDownload book(String subject,UUID productId) {
        var user=requireApprovedStudent(subject);
        var product=commerce.entitledBook(user.id(),productId).orElseThrow(()->
            new ApiException(HttpStatus.NOT_FOUND,"BOOK_NOT_AVAILABLE","Purchase this book before downloading it."));
        var resource=new ClassPathResource("books/"+product.downloadResource());
        if(!resource.exists()) throw new ApiException(HttpStatus.NOT_FOUND,"BOOK_FILE_NOT_FOUND","The book file is unavailable.");
        return new BookDownload(product.slug()+".pdf",resource);
    }

    public AdminOverview adminOverview() {
        var products=commerce.allProducts().stream().map(ProductView::from).toList();
        var orders=commerce.recentOrders().stream().map(order->new AdminOrderView(order.id(),order.buyerName(),
            order.buyerEmail(),order.status(),order.totalToman(),order.createdAt().toString(),order.invoiceId(),
            order.invoiceNumber())).toList();
        return new AdminOverview(new AdminMetrics(products.size(),commerce.orderCount(),commerce.approvedRevenue(),
            commerce.entitlementCount()),products,orders);
    }

    @Transactional
    public ProductView updateProduct(UUID actorId,UUID productId,AdminProductRequest request) {
        commerce.product(productId).orElseThrow(()->
            new ApiException(HttpStatus.NOT_FOUND,"PRODUCT_NOT_FOUND","Product not found."));
        commerce.updateProduct(productId,request.priceToman(),request.active());
        audit.record(actorId,"PRODUCT_UPDATED","PRODUCT",productId.toString(),
            Map.of("priceToman",request.priceToman(),"active",request.active()));
        return ProductView.from(commerce.product(productId).orElseThrow());
    }

    private PurchaseView purchase(UUID userId,UUID orderId) {
        var order=commerce.orderForUser(userId,orderId).orElseThrow();
        return purchase(userId,order);
    }

    private PurchaseView purchase(UUID userId,CommerceRepository.OrderRow order) {
        var items=commerce.items(order.id()).stream().map(PurchaseItemView::from).toList();
        return new PurchaseView(order.id(),order.status(),order.subtotalToman(),order.totalToman(),"TOMAN",
            order.createdAt().toString(),order.invoiceId(),order.invoiceNumber(),items);
    }

    private UserAccount requireApprovedStudent(String subject) {
        var user=auth.requireUser(subject);
        if(!user.emailVerified()||!user.approved()) {
            throw new ApiException(HttpStatus.FORBIDDEN,"ACCOUNT_NOT_APPROVED","Administrator approval is required.");
        }
        if(user.role()!=Role.STUDENT) {
            throw new ApiException(HttpStatus.FORBIDDEN,"STUDENT_ACCOUNT_REQUIRED","A student account is required.");
        }
        return user;
    }
}
