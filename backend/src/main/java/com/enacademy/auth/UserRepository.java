package com.enacademy.auth;

import com.enacademy.domain.Role;
import com.enacademy.domain.UserAccount;
import com.enacademy.domain.UserStatus;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepository {
    private final JdbcClient jdbc;

    public UserRepository(JdbcClient jdbc) { this.jdbc = jdbc; }

    public Optional<UserAccount> findByEmail(String email) {
        return jdbc.sql("SELECT * FROM users WHERE email = :email")
            .param("email", email).query(this::map).optional();
    }

    public Optional<UserAccount> findById(UUID id) {
        return jdbc.sql("SELECT * FROM users WHERE id = :id")
            .param("id", id).query(this::map).optional();
    }

    public List<UserAccount> findStudents(UserStatus status) {
        var sql = "SELECT * FROM users WHERE role = 'STUDENT'" +
            (status == null ? "" : " AND status = :status") + " ORDER BY created_at DESC";
        var statement = jdbc.sql(sql);
        if (status != null) statement = statement.param("status", status.name());
        return statement.query(this::map).list();
    }

    public long countStudents(UserStatus status) {
        return jdbc.sql("SELECT count(*) FROM users WHERE role='STUDENT' AND status=:status")
            .param("status", status.name()).query(Long.class).single();
    }

    public UserAccount insert(String name, String email, String hash, Role role, UserStatus status) {
        UUID id = UUID.randomUUID();
        jdbc.sql("""
            INSERT INTO users(id,email,full_name,password_hash,role,status)
            VALUES (:id,:email,:name,:hash,:role,:status)
            """).param("id", id).param("email", email).param("name", name).param("hash", hash)
            .param("role", role.name()).param("status", status.name()).update();
        return findById(id).orElseThrow();
    }

    public void markEmailVerified(UUID id) {
        jdbc.sql("UPDATE users SET email_verified_at=now(), updated_at=now() WHERE id=:id")
            .param("id", id).update();
    }

    public void updateStatus(UUID id, UserStatus status) {
        jdbc.sql("UPDATE users SET status=:status, updated_at=now() WHERE id=:id")
            .param("id", id).param("status", status.name()).update();
    }

    public void updatePassword(UUID id,String passwordHash) {
        jdbc.sql("UPDATE users SET password_hash=:hash,updated_at=now() WHERE id=:id")
            .param("hash",passwordHash).param("id",id).update();
    }

    private UserAccount map(java.sql.ResultSet rs, int row) throws java.sql.SQLException {
        Timestamp verified = rs.getTimestamp("email_verified_at");
        return new UserAccount(
            rs.getObject("id", UUID.class), rs.getString("email"), rs.getString("full_name"),
            rs.getString("password_hash"), Role.valueOf(rs.getString("role")),
            UserStatus.valueOf(rs.getString("status")), verified == null ? null : verified.toInstant(),
            rs.getTimestamp("created_at").toInstant(), rs.getTimestamp("updated_at").toInstant()
        );
    }
}
