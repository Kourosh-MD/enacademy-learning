package com.enacademy;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.enacademy.auth.AuthService;
import com.enacademy.auth.TokenRepository;
import com.enacademy.auth.UserRepository;
import com.enacademy.commerce.CommerceRepository;
import com.enacademy.domain.Role;
import com.enacademy.domain.UserStatus;
import com.enacademy.exam.ExamRepository;
import com.enacademy.learning.LearningRepository;
import com.enacademy.shared.ApiException;
import io.swagger.v3.oas.models.OpenAPI;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
class EnacademyApiApplicationTests {
    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine")
        .withDatabaseName("enacademy_test").withUsername("test").withPassword("test");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired LearningRepository learning;
    @Autowired UserRepository users;
    @Autowired CommerceRepository commerce;
    @Autowired ExamRepository exams;
    @Autowired AuthService auth;
    @Autowired TokenRepository tokens;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired OpenAPI openApi;

    @Test
    void openApiTeachesTheContractAndAuthenticationSchemes() {
        assertThat(openApi.getInfo().getTitle()).isEqualTo("ENAcademy API");
        assertThat(openApi.getInfo().getVersion()).isEqualTo("1.0.0");
        assertThat(openApi.getTags()).extracting(tag->tag.getName())
            .containsExactly("Authentication","Learning","Commerce","Exams","Administration");
        assertThat(openApi.getComponents().getSecuritySchemes())
            .containsKeys("bearerAuth","refreshCookie");
        assertThat(openApi.getComponents().getSecuritySchemes().get("bearerAuth").getScheme())
            .isEqualTo("bearer");
    }

    @Test
    void migrationsSeedTheFullCurriculumAndBootstrapTheAdmin() {
        assertThat(learning.modules()).hasSize(8);
        assertThat(commerce.allProducts()).hasSize(4);
        assertThat(exams.adminExams()).hasSize(2).allSatisfy(exam -> {
            assertThat(exam.published()).isTrue();
            assertThat(exam.questionCount()).isEqualTo(6);
        });
        assertThat(learning.modules().stream().flatMap(module -> learning.lessonsForModule(module.id()).stream())).hasSize(16);
        assertThat(users.findByEmail("admin@enacademy.local")).get().satisfies(admin -> {
            assertThat(admin.approved()).isTrue();
            assertThat(admin.emailVerified()).isTrue();
        });
    }

    @Test
    void passwordResetIsOneTimeAndRevokesEveryRefreshSession() {
        String email="reset-"+UUID.randomUUID()+"@example.test";
        var user=users.insert("Reset Test",email,passwordEncoder.encode("OldStrongPass2026"),
            Role.STUDENT,UserStatus.APPROVED);
        users.markEmailVerified(user.id());

        String refreshToken="refresh-"+UUID.randomUUID();
        String resetToken="reset-"+UUID.randomUUID();
        tokens.createRefresh(user.id(),AuthService.hash(refreshToken),Instant.now().plus(Duration.ofDays(7)));
        tokens.createPasswordReset(user.id(),AuthService.hash(resetToken),Instant.now().plus(Duration.ofHours(1)));

        auth.resetPassword(resetToken,"NewStrongPass2026");

        assertThat(passwordEncoder.matches("NewStrongPass2026",users.findByEmail(email).orElseThrow().passwordHash()))
            .isTrue();
        assertThat(tokens.consumeRefresh(AuthService.hash(refreshToken))).isEmpty();
        assertThatThrownBy(()->auth.resetPassword(resetToken,"AnotherPass2026"))
            .isInstanceOfSatisfying(ApiException.class,
                problem->assertThat(problem.code()).isEqualTo("INVALID_PASSWORD_RESET_TOKEN"));
    }
}
