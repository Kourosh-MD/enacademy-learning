package com.enacademy.admin;

import com.enacademy.auth.AuthModels.UserView;
import com.enacademy.auth.UserRepository;
import com.enacademy.domain.Role;
import com.enacademy.domain.UserStatus;
import com.enacademy.shared.ApiException;
import com.enacademy.shared.AuditService;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminService {
    public record StatusRequest(@NotNull UserStatus status) {}
    public record Metrics(long pending,long approved,long rejected,long suspended,long completions) {}
    public record AdminOverview(Metrics metrics,List<UserView> students) {}
    public record AuditView(String action,String targetType,String targetId,String actor,String createdAt) {}
    private final UserRepository users; private final AuditService audit; private final JdbcClient jdbc;
    public AdminService(UserRepository users,AuditService audit,JdbcClient jdbc){this.users=users;this.audit=audit;this.jdbc=jdbc;}

    public AdminOverview overview(UserStatus status) {
        var metrics=new Metrics(users.countStudents(UserStatus.PENDING),users.countStudents(UserStatus.APPROVED),
            users.countStudents(UserStatus.REJECTED),users.countStudents(UserStatus.SUSPENDED),
            jdbc.sql("SELECT count(*) FROM lesson_progress WHERE completed=true").query(Long.class).single());
        return new AdminOverview(metrics,users.findStudents(status).stream().map(UserView::from).toList());
    }

    @Transactional
    public UserView updateStatus(UUID actorId,UUID studentId,UserStatus status) {
        var student=users.findById(studentId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"STUDENT_NOT_FOUND","Student not found."));
        if(student.role()!=Role.STUDENT) throw new ApiException(HttpStatus.BAD_REQUEST,"NOT_A_STUDENT","Administrator accounts cannot be changed here.");
        if(status==UserStatus.APPROVED&&!student.emailVerified()) throw new ApiException(HttpStatus.CONFLICT,"EMAIL_NOT_VERIFIED","The student must verify their email before approval.");
        users.updateStatus(studentId,status);
        audit.record(actorId,"STUDENT_STATUS_CHANGED","USER",studentId.toString(),Map.of("from",student.status().name(),"to",status.name()));
        return UserView.from(users.findById(studentId).orElseThrow());
    }

    public List<AuditView> recentAudit() {
        return jdbc.sql("""
            SELECT a.action,a.target_type,a.target_id,coalesce(u.email,'system') actor,a.created_at
            FROM audit_events a LEFT JOIN users u ON u.id=a.actor_user_id
            ORDER BY a.created_at DESC LIMIT 50
            """).query((rs,row)->new AuditView(rs.getString("action"),rs.getString("target_type"),
                rs.getString("target_id"),rs.getString("actor"),rs.getTimestamp("created_at").toInstant().toString())).list();
    }
}
