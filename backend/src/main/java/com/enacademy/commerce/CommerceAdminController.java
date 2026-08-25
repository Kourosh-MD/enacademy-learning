package com.enacademy.commerce;

import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/commerce")
public class CommerceAdminController {
    private final CommerceService service;
    public CommerceAdminController(CommerceService service){this.service=service;}

    @GetMapping
    CommerceService.AdminOverview overview(){return service.adminOverview();}

    @PatchMapping("/products/{productId}")
    CommerceService.ProductView update(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID productId,
                                        @Valid @RequestBody CommerceService.AdminProductRequest request) {
        return service.updateProduct(UUID.fromString(jwt.getSubject()),productId,request);
    }

    @GetMapping(value="/invoices/{invoiceId}/pdf",produces=MediaType.APPLICATION_PDF_VALUE)
    ResponseEntity<byte[]> invoice(@PathVariable UUID invoiceId) {
        byte[] pdf=service.adminInvoicePdf(invoiceId);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment()
                .filename("enacademy-invoice-"+invoiceId+".pdf",StandardCharsets.UTF_8).build().toString())
            .header(HttpHeaders.CONTENT_LANGUAGE,"fa")
            .contentType(MediaType.APPLICATION_PDF).contentLength(pdf.length).body(pdf);
    }
}
