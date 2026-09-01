package com.enacademy.commerce;

import com.enacademy.config.OpenApiConfig;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name="Commerce")
@SecurityRequirement(name=OpenApiConfig.BEARER_SCHEME)
public class CommerceController {
    private final CommerceService service;
    public CommerceController(CommerceService service){this.service=service;}

    @GetMapping("/products")
    @Operation(summary="List store products",description="Returns the active bilingual catalog with the authenticated student's ownership state.")
    List<CommerceService.ProductView> products(@AuthenticationPrincipal Jwt jwt) {
        return service.products(jwt.getSubject());
    }

    @PostMapping("/purchases")
    @Operation(summary="Create a beta purchase",description="Creates an automatically approved local purchase, snapshots item prices, grants entitlements, and generates one invoice. No real payment gateway is called.")
    CommerceService.PurchaseView checkout(@AuthenticationPrincipal Jwt jwt,
                                           @Valid @RequestBody CommerceService.CheckoutRequest request) {
        return service.checkout(jwt.getSubject(),request);
    }

    @GetMapping("/purchases")
    @Operation(summary="List the student's purchases",description="Returns purchase history and invoice identifiers owned by the authenticated student.")
    List<CommerceService.PurchaseView> purchases(@AuthenticationPrincipal Jwt jwt) {
        return service.purchases(jwt.getSubject());
    }

    @GetMapping(value="/invoices/{invoiceId}/pdf",produces=MediaType.APPLICATION_PDF_VALUE)
    @Operation(summary="Download an owned invoice",description="Returns a Persian PDF only when the invoice belongs to the authenticated student.")
    ResponseEntity<byte[]> invoice(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID invoiceId) {
        byte[] pdf=service.invoicePdf(jwt.getSubject(),invoiceId);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment()
                .filename("enacademy-invoice-"+invoiceId+".pdf",StandardCharsets.UTF_8).build().toString())
            .header(HttpHeaders.CONTENT_LANGUAGE,"fa")
            .contentType(MediaType.APPLICATION_PDF).contentLength(pdf.length).body(pdf);
    }

    @GetMapping(value="/books/{productId}/download",produces=MediaType.APPLICATION_PDF_VALUE)
    @Operation(summary="Download an owned book",description="Returns a protected PDF only when the authenticated student owns the book entitlement.")
    ResponseEntity<Resource> book(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID productId) throws IOException {
        var download=service.book(jwt.getSubject(),productId);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment()
                .filename(download.filename(),StandardCharsets.UTF_8).build().toString())
            .contentType(MediaType.APPLICATION_PDF).contentLength(download.resource().contentLength())
            .body(download.resource());
    }
}
