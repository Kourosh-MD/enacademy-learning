package com.enacademy.exam;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class ExamRepository {
    public record ExamRow(UUID id,String slug,String titleEn,String titleFa,String descriptionEn,
                          String descriptionFa,String level,int durationMinutes,int passingScore,
                          Instant startsAt,Instant endsAt,boolean published,int questionCount,
                          boolean entitled,UUID attemptId,String attemptStatus,Integer percentage,Boolean passed) {}
    public record QuestionRow(UUID id,UUID examId,int position,String promptEn,String promptFa,
                              String optionsJson,String correctOption,String explanationEn,
                              String explanationFa,int points) {}
    public record AttemptRow(UUID id,UUID examId,UUID userId,String status,Instant startedAt,
                             Instant deadlineAt,Instant submittedAt,Integer scorePoints,Integer maxPoints,
                             Integer percentage,Boolean passed,Instant lastSavedAt,int version) {}
    public record AnswerRow(UUID questionId,String selectedOption) {}
    public record GradeRow(int scorePoints,int maxPoints) {}
    public record AttemptCreation(AttemptRow attempt,boolean created) {}
    public record AdminExamRow(UUID id,String slug,String titleEn,String titleFa,String level,int durationMinutes,
                               int passingScore,Instant startsAt,Instant endsAt,boolean published,
                               int questionCount,long attempts,long submitted) {}
    public record AdminAttemptRow(UUID id,String examTitle,String studentName,String studentEmail,String status,
                                  Instant startedAt,Instant submittedAt,Integer percentage,Boolean passed) {}

    private final JdbcClient jdbc;
    public ExamRepository(JdbcClient jdbc){this.jdbc=jdbc;}

    public List<ExamRow> examsForUser(UUID userId) {
        return jdbc.sql("""
            SELECT e.*,
              (SELECT count(*) FROM exam_questions q WHERE q.exam_id=e.id) question_count,
              EXISTS(
                SELECT 1 FROM product_entitlements pe
                JOIN products p ON p.id=pe.product_id
                WHERE pe.user_id=:user AND p.product_type='COURSE' AND p.target_key=e.level
              ) entitled,
              a.id attempt_id,a.status attempt_status,a.percentage,a.passed
            FROM exams e
            LEFT JOIN exam_attempts a ON a.exam_id=e.id AND a.user_id=:user
            WHERE e.published=true
            ORDER BY e.starts_at,e.level,e.title_en
            """).param("user",userId).query(this::mapExam).list();
    }

    public Optional<ExamRow> exam(UUID examId,UUID userId) {
        return examQuery("WHERE e.id=:exam",userId).param("exam",examId).query(this::mapExam).optional();
    }

    public Optional<ExamRow> examBySlug(String slug,UUID userId) {
        return examQuery("WHERE e.slug=:slug",userId).param("slug",slug).query(this::mapExam).optional();
    }

    private JdbcClient.StatementSpec examQuery(String where,UUID userId) {
        return jdbc.sql("""
            SELECT e.*,
              (SELECT count(*) FROM exam_questions q WHERE q.exam_id=e.id) question_count,
              EXISTS(
                SELECT 1 FROM product_entitlements pe
                JOIN products p ON p.id=pe.product_id
                WHERE pe.user_id=:user AND p.product_type='COURSE' AND p.target_key=e.level
              ) entitled,
              a.id attempt_id,a.status attempt_status,a.percentage,a.passed
            FROM exams e
            LEFT JOIN exam_attempts a ON a.exam_id=e.id AND a.user_id=:user
            """+where).param("user",userId);
    }

    public List<QuestionRow> questions(UUID examId) {
        return jdbc.sql("""
            SELECT id,exam_id,position,prompt_en,prompt_fa,options::text options_json,correct_option,
                   explanation_en,explanation_fa,points
            FROM exam_questions WHERE exam_id=:exam ORDER BY position
            """).param("exam",examId).query((rs,row)->new QuestionRow(
                rs.getObject("id",UUID.class),rs.getObject("exam_id",UUID.class),rs.getInt("position"),
                rs.getString("prompt_en"),rs.getString("prompt_fa"),rs.getString("options_json"),
                rs.getString("correct_option"),rs.getString("explanation_en"),rs.getString("explanation_fa"),
                rs.getInt("points"))).list();
    }

    public Optional<AttemptRow> attemptForExam(UUID examId,UUID userId) {
        return jdbc.sql("SELECT * FROM exam_attempts WHERE exam_id=:exam AND user_id=:user")
            .param("exam",examId).param("user",userId).query(this::mapAttempt).optional();
    }

    public Optional<AttemptRow> attemptForUser(UUID attemptId,UUID userId) {
        return jdbc.sql("SELECT * FROM exam_attempts WHERE id=:attempt AND user_id=:user")
            .param("attempt",attemptId).param("user",userId).query(this::mapAttempt).optional();
    }

    public Optional<AttemptRow> lockAttempt(UUID attemptId,UUID userId) {
        return jdbc.sql("SELECT * FROM exam_attempts WHERE id=:attempt AND user_id=:user FOR UPDATE")
            .param("attempt",attemptId).param("user",userId).query(this::mapAttempt).optional();
    }

    public AttemptCreation createOrGetAttempt(UUID examId,UUID userId,Instant deadline) {
        UUID id=UUID.randomUUID();
        int inserted=jdbc.sql("""
            INSERT INTO exam_attempts(id,exam_id,user_id,status,deadline_at)
            VALUES(:id,:exam,:user,'IN_PROGRESS',:deadline)
            ON CONFLICT (exam_id,user_id) DO NOTHING
            """).param("id",id).param("exam",examId).param("user",userId).param("deadline",deadline).update();
        return new AttemptCreation(attemptForExam(examId,userId).orElseThrow(),inserted==1);
    }

    public List<AnswerRow> answers(UUID attemptId) {
        return jdbc.sql("SELECT question_id,selected_option FROM exam_answers WHERE attempt_id=:attempt")
            .param("attempt",attemptId).query((rs,row)->new AnswerRow(
                rs.getObject("question_id",UUID.class),rs.getString("selected_option"))).list();
    }

    public void upsertAnswers(UUID attemptId,String answersJson) {
        jdbc.sql("""
            INSERT INTO exam_answers(attempt_id,question_id,selected_option)
            SELECT :attempt,input."questionId",input."selectedOption"
            FROM jsonb_to_recordset(CAST(:answers AS jsonb))
              AS input("questionId" uuid,"selectedOption" text)
            ON CONFLICT (attempt_id,question_id) DO UPDATE
              SET selected_option=EXCLUDED.selected_option,saved_at=now()
            """).param("attempt",attemptId).param("answers",answersJson).update();
    }

    public void touchAttempt(UUID attemptId) {
        jdbc.sql("UPDATE exam_attempts SET last_saved_at=now(),version=version+1 WHERE id=:id")
            .param("id",attemptId).update();
    }

    public GradeRow grade(UUID attemptId,UUID examId) {
        return jdbc.sql("""
            SELECT coalesce(sum(CASE WHEN a.selected_option=q.correct_option THEN q.points ELSE 0 END),0) score,
                   coalesce(sum(q.points),0) maximum
            FROM exam_questions q
            LEFT JOIN exam_answers a ON a.question_id=q.id AND a.attempt_id=:attempt
            WHERE q.exam_id=:exam
            """).param("attempt",attemptId).param("exam",examId).query((rs,row)->
                new GradeRow(rs.getInt("score"),rs.getInt("maximum"))).single();
    }

    public AttemptRow submit(UUID attemptId,String status,GradeRow grade,int percentage,boolean passed) {
        jdbc.sql("""
            UPDATE exam_attempts SET status=:status,submitted_at=now(),score_points=:score,
              max_points=:maximum,percentage=:percentage,passed=:passed,version=version+1
            WHERE id=:id
            """).param("status",status).param("score",grade.scorePoints()).param("maximum",grade.maxPoints())
            .param("percentage",percentage).param("passed",passed).param("id",attemptId).update();
        return jdbc.sql("SELECT * FROM exam_attempts WHERE id=:id").param("id",attemptId)
            .query(this::mapAttempt).single();
    }

    public long examCount(){return jdbc.sql("SELECT count(*) FROM exams").query(Long.class).single();}
    public long publishedCount(){return jdbc.sql("SELECT count(*) FROM exams WHERE published=true").query(Long.class).single();}
    public long attemptCount(){return jdbc.sql("SELECT count(*) FROM exam_attempts").query(Long.class).single();}
    public long submittedCount(){return jdbc.sql("SELECT count(*) FROM exam_attempts WHERE status IN ('SUBMITTED','AUTO_SUBMITTED')").query(Long.class).single();}
    public int averagePercentage(){return jdbc.sql("SELECT coalesce(round(avg(percentage)),0)::int FROM exam_attempts WHERE percentage IS NOT NULL").query(Integer.class).single();}

    public List<AdminExamRow> adminExams() {
        return jdbc.sql("""
            SELECT e.*,count(DISTINCT q.id) question_count,count(DISTINCT a.id) attempts,
              count(DISTINCT a.id) FILTER (WHERE a.status IN ('SUBMITTED','AUTO_SUBMITTED')) submitted
            FROM exams e
            LEFT JOIN exam_questions q ON q.exam_id=e.id
            LEFT JOIN exam_attempts a ON a.exam_id=e.id
            GROUP BY e.id ORDER BY e.starts_at,e.level
            """).query((rs,row)->new AdminExamRow(
                rs.getObject("id",UUID.class),rs.getString("slug"),rs.getString("title_en"),
                rs.getString("title_fa"),rs.getString("level"),rs.getInt("duration_minutes"),
                rs.getInt("passing_score"),rs.getTimestamp("starts_at").toInstant(),
                rs.getTimestamp("ends_at").toInstant(),rs.getBoolean("published"),
                rs.getInt("question_count"),rs.getLong("attempts"),rs.getLong("submitted"))).list();
    }

    public List<AdminAttemptRow> recentAttempts() {
        return jdbc.sql("""
            SELECT a.id,e.title_en exam_title,u.full_name student_name,u.email student_email,a.status,
                   a.started_at,a.submitted_at,a.percentage,a.passed
            FROM exam_attempts a
            JOIN exams e ON e.id=a.exam_id
            JOIN users u ON u.id=a.user_id
            ORDER BY a.started_at DESC LIMIT 100
            """).query((rs,row)->new AdminAttemptRow(
                rs.getObject("id",UUID.class),rs.getString("exam_title"),rs.getString("student_name"),
                rs.getString("student_email"),rs.getString("status"),rs.getTimestamp("started_at").toInstant(),
                instant(rs.getTimestamp("submitted_at")),(Integer)rs.getObject("percentage"),
                (Boolean)rs.getObject("passed"))).list();
    }

    public void updateExam(UUID examId,boolean published,Instant startsAt,Instant endsAt,
                           int durationMinutes,int passingScore) {
        jdbc.sql("""
            UPDATE exams SET published=:published,starts_at=:starts,ends_at=:ends,
              duration_minutes=:duration,passing_score=:passing,updated_at=now()
            WHERE id=:id
            """).param("published",published).param("starts",startsAt).param("ends",endsAt)
            .param("duration",durationMinutes).param("passing",passingScore).param("id",examId).update();
    }

    private ExamRow mapExam(java.sql.ResultSet rs,int row) throws java.sql.SQLException {
        return new ExamRow(rs.getObject("id",UUID.class),rs.getString("slug"),rs.getString("title_en"),
            rs.getString("title_fa"),rs.getString("description_en"),rs.getString("description_fa"),
            rs.getString("level"),rs.getInt("duration_minutes"),rs.getInt("passing_score"),
            rs.getTimestamp("starts_at").toInstant(),rs.getTimestamp("ends_at").toInstant(),
            rs.getBoolean("published"),rs.getInt("question_count"),rs.getBoolean("entitled"),
            rs.getObject("attempt_id",UUID.class),rs.getString("attempt_status"),
            (Integer)rs.getObject("percentage"),(Boolean)rs.getObject("passed"));
    }

    private AttemptRow mapAttempt(java.sql.ResultSet rs,int row) throws java.sql.SQLException {
        return new AttemptRow(rs.getObject("id",UUID.class),rs.getObject("exam_id",UUID.class),
            rs.getObject("user_id",UUID.class),rs.getString("status"),rs.getTimestamp("started_at").toInstant(),
            rs.getTimestamp("deadline_at").toInstant(),instant(rs.getTimestamp("submitted_at")),
            (Integer)rs.getObject("score_points"),(Integer)rs.getObject("max_points"),
            (Integer)rs.getObject("percentage"),(Boolean)rs.getObject("passed"),
            instant(rs.getTimestamp("last_saved_at")),rs.getInt("version"));
    }

    private static Instant instant(Timestamp value){return value==null?null:value.toInstant();}
}
