package com.enacademy.auth;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class TokenRepository {
    public record StoredToken(UUID id, UUID userId, Instant expiresAt) {}
    private final JdbcClient jdbc;
    public TokenRepository(JdbcClient jdbc) { this.jdbc = jdbc; }

    public void createVerification(UUID userId, String hash, Instant expiresAt) {
        jdbc.sql("UPDATE email_verification_tokens SET used_at=now() WHERE user_id=:user AND used_at IS NULL")
            .param("user", userId).update();
        jdbc.sql("INSERT INTO email_verification_tokens(id,user_id,token_hash,expires_at) VALUES(:id,:user,:hash,:expires)")
            .param("id", UUID.randomUUID()).param("user", userId).param("hash", hash)
            .param("expires", java.sql.Timestamp.from(expiresAt)).update();
    }

    public Optional<StoredToken> consumeVerification(String hash) {
        var token = jdbc.sql("""
            SELECT id,user_id,expires_at FROM email_verification_tokens
            WHERE token_hash=:hash AND used_at IS NULL AND expires_at > now()
            """).param("hash", hash).query((rs, row) -> new StoredToken(
                rs.getObject("id", UUID.class), rs.getObject("user_id", UUID.class),
                rs.getTimestamp("expires_at").toInstant())).optional();
        token.ifPresent(value -> jdbc.sql("UPDATE email_verification_tokens SET used_at=now() WHERE id=:id")
            .param("id", value.id()).update());
        return token;
    }

    public void createRefresh(UUID userId, String hash, Instant expiresAt) {
        jdbc.sql("INSERT INTO refresh_tokens(id,user_id,token_hash,expires_at) VALUES(:id,:user,:hash,:expires)")
            .param("id", UUID.randomUUID()).param("user", userId).param("hash", hash)
            .param("expires", java.sql.Timestamp.from(expiresAt)).update();
    }

    public Optional<StoredToken> consumeRefresh(String hash) {
        var token = jdbc.sql("""
            SELECT id,user_id,expires_at FROM refresh_tokens
            WHERE token_hash=:hash AND revoked_at IS NULL AND expires_at > now()
            """).param("hash", hash).query((rs, row) -> new StoredToken(
                rs.getObject("id", UUID.class), rs.getObject("user_id", UUID.class),
                rs.getTimestamp("expires_at").toInstant())).optional();
        token.ifPresent(value -> revoke(value.id()));
        return token;
    }

    public void revokeByHash(String hash) {
        jdbc.sql("UPDATE refresh_tokens SET revoked_at=now() WHERE token_hash=:hash AND revoked_at IS NULL")
            .param("hash", hash).update();
    }

    private void revoke(UUID id) {
        jdbc.sql("UPDATE refresh_tokens SET revoked_at=now() WHERE id=:id").param("id", id).update();
    }
}
