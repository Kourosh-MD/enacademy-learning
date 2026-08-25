package com.enacademy.commerce;

import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Font;
import java.awt.FontMetrics;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.font.TextLayout;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import javax.imageio.ImageIO;
import org.springframework.stereotype.Service;

@Service
public class InvoicePdfService {
    private static final int WIDTH=1240;
    private static final int HEIGHT=1754;
    private static final Color INK=new Color(16,38,31);
    private static final Color MUTED=new Color(92,113,105);
    private static final Color MINT=new Color(31,168,120);
    private static final Color SOFT=new Color(237,248,243);
    private static final Color LINE=new Color(220,231,225);
    private static final Color WARNING=new Color(255,245,218);
    private static final ZoneId TEHRAN=ZoneId.of("Asia/Tehran");

    public byte[] render(CommerceRepository.InvoiceRow invoice) {
        try {
            BufferedImage page=new BufferedImage(WIDTH,HEIGHT,BufferedImage.TYPE_INT_RGB);
            Graphics2D graphics=page.createGraphics();
            graphics.setColor(Color.WHITE);
            graphics.fillRect(0,0,WIDTH,HEIGHT);
            graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING,RenderingHints.VALUE_ANTIALIAS_ON);
            graphics.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING,RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
            graphics.setRenderingHint(RenderingHints.KEY_RENDERING,RenderingHints.VALUE_RENDER_QUALITY);

            Font regular=font("/fonts/NotoSansArabic-Regular.ttf",32);
            Font bold=font("/fonts/NotoSansArabic-Bold.ttf",32);
            Font latinRegular=font("/fonts/NotoSans-Regular.ttf",32);
            Font latinBold=font("/fonts/NotoSans-Bold.ttf",32);
            Font small=regular.deriveFont(24f);
            Font body=regular.deriveFont(28f);
            Font strong=bold.deriveFont(28f);
            Font title=bold.deriveFont(52f);
            Font brand=latinBold.deriveFont(42f);

            graphics.setColor(MINT);
            graphics.setFont(brand);
            graphics.drawString("ENAcademy",72,104);
            drawRtl(graphics,"فاکتور خرید آزمایشی",title,INK,WIDTH-72,112);

            graphics.setColor(WARNING);
            graphics.fillRoundRect(72,145,WIDTH-144,64,14,14);
            graphics.setColor(new Color(230,180,70));
            graphics.setStroke(new BasicStroke(2f));
            graphics.drawRoundRect(72,145,WIDTH-144,64,14,14);
            drawCentered(graphics,"نسخه آزمایشی - پرداخت واقعی انجام نشده است",strong,INK,WIDTH/2,187);

            int detailTop=252;
            int detailHeight=82;
            drawInfoBox(graphics,72,detailTop,530,detailHeight,"شماره فاکتور",
                invoice.invoiceNumber().replace("ENA-",""),small,strong);
            drawInfoBox(graphics,638,detailTop,530,detailHeight,"تاریخ صدور",jalali(invoice.issuedAt()),small,strong);
            drawInfoBox(graphics,72,detailTop+100,530,detailHeight,"خریدار",invoice.buyerName(),small,strong);
            drawInfoBox(graphics,638,detailTop+100,530,detailHeight,"وضعیت","تأیید شده",small,strong);
            drawInfoBoxLatin(graphics,72,detailTop+200,530,detailHeight,"ایمیل",invoice.buyerEmail(),
                small,latinRegular.deriveFont(25f));
            drawInfoBox(graphics,638,detailTop+200,530,detailHeight,"فروشنده","آکادمی آموزش زبان",small,strong);

            drawRtl(graphics,"جزئیات سفارش",bold.deriveFont(34f),INK,WIDTH-72,600);
            int tableX=72;
            int tableY=635;
            int tableWidth=WIDTH-144;
            int headerHeight=62;
            int[] widths={480,120,238,258};
            String[] headers={"محصول","تعداد","قیمت واحد","مبلغ"};
            int cursor=tableX;
            for(int index=0;index<widths.length;index++) {
                graphics.setColor(MINT);
                graphics.fillRect(cursor,tableY,widths[index],headerHeight);
                drawCentered(graphics,headers[index],small.deriveFont(Font.BOLD),Color.WHITE,
                    cursor+widths[index]/2,tableY+41);
                cursor+=widths[index];
            }

            int rowY=tableY+headerHeight;
            int rowHeight=76;
            for(var item:invoice.items()) {
                cursor=tableX;
                String[] values={item.titleFa(),String.valueOf(item.quantity()),money(item.unitPriceToman()),
                    money(item.lineTotalToman())};
                for(int index=0;index<widths.length;index++) {
                    graphics.setColor(index==0?SOFT:Color.WHITE);
                    graphics.fillRect(cursor,rowY,widths[index],rowHeight);
                    graphics.setColor(LINE);
                    graphics.drawRect(cursor,rowY,widths[index],rowHeight);
                    if(index==0) drawRtl(graphics,fit(values[index],strong,widths[index]-24,graphics),strong,INK,
                        cursor+widths[index]-12,rowY+49);
                    else drawCentered(graphics,values[index],index==3?strong:body,INK,
                        cursor+widths[index]/2,rowY+49);
                    cursor+=widths[index];
                }
                rowY+=rowHeight;
            }

            int totalsWidth=520;
            int totalsX=WIDTH-72-totalsWidth;
            int totalsY=rowY+32;
            drawTotalRow(graphics,totalsX,totalsY,totalsWidth,"جمع جزء",money(invoice.subtotalToman()),body,strong,false);
            drawTotalRow(graphics,totalsX,totalsY+62,totalsWidth,"مالیات","۰ تومان",body,strong,false);
            drawTotalRow(graphics,totalsX,totalsY+124,totalsWidth,"مبلغ نهایی",money(invoice.totalToman()),strong,strong,true);

            int noteY=totalsY+235;
            drawRtl(graphics,"این سند برای گردش خرید آزمایشی آکادمی صادر شده است.",body,INK,WIDTH-72,noteY);
            drawRtl(graphics,"این فایل رسید پرداخت بانکی یا فاکتور رسمی مالیاتی نیست.",small,MUTED,WIDTH-72,noteY+45);

            graphics.setColor(LINE);
            graphics.setStroke(new BasicStroke(2f));
            graphics.drawLine(72,HEIGHT-170,WIDTH-72,HEIGHT-170);
            drawCentered(graphics,"سپاس از همراهی شما - دسترسی دوره و فایل کتاب بلافاصله فعال شده است.",
                body,INK,WIDTH/2,HEIGHT-112);
            drawCenteredLatin(graphics,invoice.invoiceNumber(),latinRegular.deriveFont(20f),MUTED,WIDTH/2,HEIGHT-70);
            graphics.dispose();

            var jpeg=new ByteArrayOutputStream();
            ImageIO.write(page,"jpg",jpeg);
            return singlePagePdf(jpeg.toByteArray(),WIDTH,HEIGHT);
        } catch(IOException|java.awt.FontFormatException exception) {
            throw new IllegalStateException("Could not generate invoice PDF",exception);
        }
    }

    private Font font(String resource,float size) throws IOException,java.awt.FontFormatException {
        try(InputStream input=getClass().getResourceAsStream(resource)) {
            if(input==null) throw new IOException("Missing PDF font "+resource);
            return Font.createFont(Font.TRUETYPE_FONT,input).deriveFont(size);
        }
    }

    private void drawInfoBox(Graphics2D graphics,int x,int y,int width,int height,String label,String value,
                             Font labelFont,Font valueFont) {
        graphics.setColor(SOFT);
        graphics.fillRoundRect(x,y,width,height,12,12);
        graphics.setColor(LINE);
        graphics.drawRoundRect(x,y,width,height,12,12);
        drawRtl(graphics,label,labelFont,MUTED,x+width-18,y+30);
        drawRtl(graphics,toPersianDigits(value),valueFont,INK,x+width-18,y+65);
    }

    private void drawInfoBoxLatin(Graphics2D graphics,int x,int y,int width,int height,String label,
                                  String value,Font labelFont,Font valueFont) {
        graphics.setColor(SOFT);
        graphics.fillRoundRect(x,y,width,height,12,12);
        graphics.setColor(LINE);
        graphics.drawRoundRect(x,y,width,height,12,12);
        drawRtl(graphics,label,labelFont,MUTED,x+width-18,y+30);
        drawLtrRight(graphics,value,valueFont,INK,x+width-18,y+65);
    }

    private void drawTotalRow(Graphics2D graphics,int x,int y,int width,String label,String value,
                              Font labelFont,Font valueFont,boolean highlight) {
        graphics.setColor(highlight?SOFT:Color.WHITE);
        graphics.fillRect(x,y,width,62);
        graphics.setColor(LINE);
        graphics.drawRect(x,y,width,62);
        drawRtl(graphics,label,labelFont,INK,x+width-18,y+41);
        drawRtl(graphics,value,valueFont,highlight?new Color(8,116,83):INK,x+width/2-18,y+41);
    }

    private void drawRtl(Graphics2D graphics,String text,Font font,Color color,float right,float baseline) {
        graphics.setColor(color);
        var layout=new TextLayout(toPersianDigits(text),font,graphics.getFontRenderContext());
        layout.draw(graphics,right-layout.getAdvance(),baseline);
    }

    private void drawCentered(Graphics2D graphics,String text,Font font,Color color,float center,float baseline) {
        graphics.setColor(color);
        var layout=new TextLayout(toPersianDigits(text),font,graphics.getFontRenderContext());
        layout.draw(graphics,center-layout.getAdvance()/2,baseline);
    }

    private void drawLtrRight(Graphics2D graphics,String text,Font font,Color color,float right,float baseline) {
        graphics.setColor(color);
        graphics.setFont(font);
        graphics.drawString(text,right-graphics.getFontMetrics(font).stringWidth(text),baseline);
    }

    private void drawCenteredLatin(Graphics2D graphics,String text,Font font,Color color,float center,float baseline) {
        graphics.setColor(color);
        graphics.setFont(font);
        graphics.drawString(text,center-graphics.getFontMetrics(font).stringWidth(text)/2f,baseline);
    }

    private String fit(String text,Font font,int maxWidth,Graphics2D graphics) {
        FontMetrics metrics=graphics.getFontMetrics(font);
        if(metrics.stringWidth(text)<=maxWidth) return text;
        String value=text;
        while(value.length()>3&&metrics.stringWidth(value+"…")>maxWidth) value=value.substring(0,value.length()-1);
        return value+"…";
    }

    private String money(long value) {
        return toPersianDigits(NumberFormat.getIntegerInstance(Locale.US).format(value)+" تومان");
    }

    private String jalali(Instant instant) {
        LocalDate date=instant.atZone(TEHRAN).toLocalDate();
        int[] jalali=gregorianToJalali(date.getYear(),date.getMonthValue(),date.getDayOfMonth());
        return toPersianDigits(String.format(Locale.ROOT,"%04d/%02d/%02d",jalali[0],jalali[1],jalali[2]));
    }

    static int[] gregorianToJalali(int gy,int gm,int gd) {
        int[] monthDays={0,31,59,90,120,151,181,212,243,273,304,334};
        int gy2=gm>2?gy+1:gy;
        long days=355666L+365L*gy+(gy2+3)/4-(gy2+99)/100+(gy2+399)/400+gd+monthDays[gm-1];
        int jy=-1595+33*(int)(days/12053);
        days%=12053;
        jy+=4*(int)(days/1461);
        days%=1461;
        if(days>365) {
            jy+=(int)((days-1)/365);
            days=(days-1)%365;
        }
        int jm;
        int jd;
        if(days<186) {
            jm=1+(int)(days/31);
            jd=1+(int)(days%31);
        } else {
            jm=7+(int)((days-186)/30);
            jd=1+(int)((days-186)%30);
        }
        return new int[]{jy,jm,jd};
    }

    static String toPersianDigits(String value) {
        char[] western={'0','1','2','3','4','5','6','7','8','9'};
        char[] persian={'۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'};
        String result=value;
        for(int index=0;index<western.length;index++) result=result.replace(western[index],persian[index]);
        return result;
    }

    private byte[] singlePagePdf(byte[] jpeg,int imageWidth,int imageHeight) throws IOException {
        var output=new ByteArrayOutputStream();
        var offsets=new ArrayList<Integer>();
        String nl=Character.toString(10);
        write(output,"%PDF-1.4"+nl);
        object(output,offsets,1,"<< /Type /Catalog /Pages 2 0 R >>");
        object(output,offsets,2,"<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
        object(output,offsets,3,"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "+
            "/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>");

        offsets.add(output.size());
        write(output,"4 0 obj"+nl+"<< /Type /XObject /Subtype /Image /Width "+imageWidth+" /Height "+imageHeight+
            " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length "+jpeg.length+" >>"+
            nl+"stream"+nl);
        output.write(jpeg);
        write(output,nl+"endstream"+nl+"endobj"+nl);

        byte[] content="q 595 0 0 842 0 0 cm /Im0 Do Q".getBytes(StandardCharsets.US_ASCII);
        offsets.add(output.size());
        write(output,"5 0 obj"+nl+"<< /Length "+content.length+" >>"+nl+"stream"+nl);
        output.write(content);
        write(output,nl+"endstream"+nl+"endobj"+nl);

        int xref=output.size();
        write(output,"xref"+nl+"0 6"+nl+"0000000000 65535 f "+nl);
        for(int offset:offsets) write(output,String.format(Locale.ROOT,"%010d 00000 n ",offset)+nl);
        write(output,"trailer"+nl+"<< /Size 6 /Root 1 0 R >>"+nl+"startxref"+nl+xref+nl+"%%EOF"+nl);
        return output.toByteArray();
    }

    private void object(ByteArrayOutputStream output,List<Integer> offsets,int number,String content) throws IOException {
        offsets.add(output.size());
        String nl=Character.toString(10);
        write(output,number+" 0 obj"+nl+content+nl+"endobj"+nl);
    }

    private void write(ByteArrayOutputStream output,String value) throws IOException {
        output.write(value.getBytes(StandardCharsets.US_ASCII));
    }
}
