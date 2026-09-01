package com.enacademy.commerce;

import com.enacademy.config.OpenApiConfig;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name="Administration")
@SecurityRequirement(name=OpenApiConfig.BEARER_SCHEME)
public class CommerceAdminController {
    private final CommerceService service;
    public CommerceAdminController(CommerceService service){this.service=service;}

    @GetMapping
    @Operation(summary="Read commerce operations",description="Returns product, order, revenue, entitlement, and recent-order information for administrators.")
    CommerceService.AdminOverview overview(){return service.adminOverview();}

    @PatchMapping("/products/{productId}")
    @Operation(summary="Update a product",description="Changes the beta price and active state of one product and records an audit event.")
    CommerceService.ProductView update(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID productId,
                                        @Valid @RequestBody CommerceService.AdminProductRequest request) {
        return service.updateProduct(UUID.fromString(jwt.getSubject()),productId,request);
    }

    @GetMapping(value="/invoices/{invoiceId}/pdf",produces=MediaType.APPLICATION_PDF_VALUE)
    @Operation(summary="Download any invoice as administrator",description="Returns a Persian invoice PDF without the student ownership restriction.")
    ResponseEntity<byte[]> invoice(@PathVariable UUID invoiceId) {
        byte[] pdf=service.adminInvoicePdf(invoiceId);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment()
                .filename("enacademy-invoice-"+invoiceId+".pdf",StandardCharsets.UTF_8).build().toString())
            .header(HttpHeaders.CONTENT_LANGUAGE,"fa")
            .contentType(MediaType.APPLICATION_PDF).contentLength(pdf.length).body(pdf);
    }
}
