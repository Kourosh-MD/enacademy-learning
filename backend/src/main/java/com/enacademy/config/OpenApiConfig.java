package com.enacademy.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import io.swagger.v3.oas.models.tags.Tag;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {
    public static final String BEARER_SCHEME = "bearerAuth";
    public static final String REFRESH_COOKIE_SCHEME = "refreshCookie";

    @Bean
    OpenAPI enacademyOpenApi() {
        return new OpenAPI()
            .info(new Info()
                .title("ENAcademy API")
                .version("1.0.0")
                .description("""
                    REST API for ENAcademy's bilingual learning, account approval, commerce, invoice,
                    protected book, and online-exam workflows. Public operations show no lock. Protected
                    operations use the bearerAuth JWT scheme. Login also sets a rotating HttpOnly refresh
                    cookie used only by refresh and logout.
                    """)
                .contact(new Contact().name("ENAcademy maintainers"))
                .license(new License().name("Open-source license to be selected before public release")))
            .servers(List.of(new Server().url("/").description("Current API origin")))
            .tags(List.of(
                new Tag().name("Authentication").description("Registration, verification, sessions, and account recovery"),
                new Tag().name("Learning").description("Curriculum, lessons, progress, XP, and saved vocabulary"),
                new Tag().name("Commerce").description("Catalog, beta purchases, entitlements, books, and Persian invoices"),
                new Tag().name("Exams").description("Timed attempts, answer autosave, submission, and grading"),
                new Tag().name("Administration").description("Student approval, audit, catalog, invoice, and exam operations")))
            .components(new Components()
                .addSecuritySchemes(BEARER_SCHEME,new SecurityScheme()
                    .type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")
                    .description("Short-lived access JWT returned by login or refresh. Enter only the token value."))
                .addSecuritySchemes(REFRESH_COOKIE_SCHEME,new SecurityScheme()
                    .type(SecurityScheme.Type.APIKEY).in(SecurityScheme.In.COOKIE).name("enacademy_refresh")
                    .description("Rotating HttpOnly refresh cookie set by login and managed by the browser.")));
    }
}
