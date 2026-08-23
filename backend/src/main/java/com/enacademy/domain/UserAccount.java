package com.enacademy.domain;

import java.time.Instant;
import java.util.UUID;

public record UserAccount(
    UUID id,
    String email,
    String fullName,
    String passwordHash,
    Role role,
    UserStatus status,
    Instant emailVerifiedAt,
    Instant createdAt,
    Instant updatedAt
) {
    public boolean emailVerified() { return emailVerifiedAt != null; }
    public boolean approved() { return status == UserStatus.APPROVED; }
}
