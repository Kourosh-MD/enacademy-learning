package com.enacademy.commerce;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class InvoicePdfServiceTests {
    @Test
    void rendersAValidPersianBetaInvoice() throws Exception {
        var item=new CommerceRepository.OrderItemRow(
            UUID.fromString("20000000-0000-0000-0000-000000000001"),"BOOK",
            "Everyday English Starter Guide","راهنمای انگلیسی روزمره",1,249000,249000);
        var invoice=new CommerceRepository.InvoiceRow(
            UUID.fromString("30000000-0000-0000-0000-000000000001"),"ENA-001001",
            Instant.parse("2026-08-25T10:00:00Z"),UUID.fromString("40000000-0000-0000-0000-000000000001"),
            "APPROVED",249000,249000,"دانشجوی آزمایشی","student@example.com",List.of(item));

        byte[] pdf=new InvoicePdfService().render(invoice);

        assertThat(pdf).hasSizeGreaterThan(20_000);
        assertThat(new String(pdf,0,8,java.nio.charset.StandardCharsets.US_ASCII)).startsWith("%PDF-1.4");
        assertThat(new String(pdf,pdf.length-12,12,java.nio.charset.StandardCharsets.US_ASCII)).contains("%%EOF");

        String preview=System.getProperty("invoice.preview.path");
        if(preview!=null&&!preview.isBlank()) Files.write(Path.of(preview),pdf);
    }

    @Test
    void formatsPersianDigitsAndJalaliDatesDeterministically() {
        assertThat(InvoicePdfService.toPersianDigits("Invoice 1405 / 123")).isEqualTo("Invoice ۱۴۰۵ / ۱۲۳");
        assertThat(InvoicePdfService.gregorianToJalali(2026,8,25)).containsExactly(1405,6,3);
    }
}
