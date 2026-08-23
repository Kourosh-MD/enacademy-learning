package com.enacademy.config;

import com.enacademy.auth.UserRepository;
import com.enacademy.domain.Role;
import com.enacademy.domain.UserStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminBootstrap implements ApplicationRunner {
    private final UserRepository users; private final PasswordEncoder passwords;
    private final String name; private final String email; private final String password;
    public AdminBootstrap(UserRepository users, PasswordEncoder passwords,
                          @Value("${app.admin.name}") String name,
                          @Value("${app.admin.email}") String email,
                          @Value("${app.admin.password}") String password) {
        this.users=users; this.passwords=passwords; this.name=name; this.email=email; this.password=password;
    }
    @Override public void run(ApplicationArguments args) {
        String normalized=email.trim().toLowerCase(java.util.Locale.ROOT);
        if (users.findByEmail(normalized).isEmpty()) {
            var admin=users.insert(name, normalized, passwords.encode(password), Role.ADMIN, UserStatus.APPROVED);
            users.markEmailVerified(admin.id());
        }
    }
}
