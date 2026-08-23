package com.enacademy.shared;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

@Service
public class AuditService {
    private final JdbcClient jdbc;
    private final ObjectMapper objectMapper;
    public AuditService(JdbcClient jdbc, ObjectMapper objectMapper) { this.jdbc = jdbc; this.objectMapper = objectMapper; }

    public void record(UUID actor, String action, String targetType, String targetId, Map<String, ?> details) {
        try {
            jdbc.sql("""
                INSERT INTO audit_events(id,actor_user_id,action,target_type,target_id,details)
                VALUES(:id,:actor,:action,:type,:target,CAST(:details AS jsonb))
                """).param("id", UUID.randomUUID()).param("actor", actor).param("action", action)
                .param("type", targetType).param("target", targetId)
                .param("details", objectMapper.writeValueAsString(details)).update();
        } catch (JacksonException exception) {
            throw new IllegalStateException("Could not serialize audit details", exception);
        }
    }
}
