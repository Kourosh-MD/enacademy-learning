package com.enacademy;

import static org.assertj.core.api.Assertions.assertThat;

import com.enacademy.auth.UserRepository;
import com.enacademy.commerce.CommerceRepository;
import com.enacademy.learning.LearningRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
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

    @Test
    void migrationsSeedTheFullCurriculumAndBootstrapTheAdmin() {
        assertThat(learning.modules()).hasSize(8);
        assertThat(commerce.allProducts()).hasSize(4);
        assertThat(learning.modules().stream().flatMap(module -> learning.lessonsForModule(module.id()).stream())).hasSize(16);
        assertThat(users.findByEmail("admin@enacademy.local")).get().satisfies(admin -> {
            assertThat(admin.approved()).isTrue();
            assertThat(admin.emailVerified()).isTrue();
        });
    }
}
