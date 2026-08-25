package com.enacademy.commerce;

import jakarta.validation.Valid;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/store")
public class CommerceController {
    private final CommerceService service;
    public CommerceController(CommerceService service){this.service=service;}

    @GetMapping("/products")
    List<CommerceService.ProductView> products(@AuthenticationPrincipal Jwt jwt) {
        return service.products(jwt.getSubject());
    }

    @PostMapping("/purchases")
    CommerceService.PurchaseView checkout(@AuthenticationPrincipal Jwt jwt,
                                           @Valid @RequestBody CommerceService.CheckoutRequest request) {
        return service.checkout(jwt.getSubject(),request);
    }

    @GetMapping("/purchases")
    List<CommerceService.PurchaseView> purchases(@AuthenticationPrincipal Jwt jwt) {
        return service.purchases(jwt.getSubject());
    }

    @GetMapping(value="/invoices/{invoiceId}/pdf",produces=MediaType.APPLICATION_PDF_VALUE)
    ResponseEntity<byte[]> invoice(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID invoiceId) {
        byte[] pdf=service.invoicePdf(jwt.getSubject(),invoiceId);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment()
                .filename("enacademy-invoice-"+invoiceId+".pdf",StandardCharsets.UTF_8).build().toString())
            .header(HttpHeaders.CONTENT_LANGUAGE,"fa")
            .contentType(MediaType.APPLICATION_PDF).contentLength(pdf.length).body(pdf);
    }

    @GetMapping(value="/books/{productId}/download",produces=MediaType.APPLICATION_PDF_VALUE)
    ResponseEntity<Resource> book(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID productId) throws IOException {
        var download=service.book(jwt.getSubject(),productId);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment()
                .filename(download.filename(),StandardCharsets.UTF_8).build().toString())
            .contentType(MediaType.APPLICATION_PDF).contentLength(download.resource().contentLength())
            .body(download.resource());
    }
}
