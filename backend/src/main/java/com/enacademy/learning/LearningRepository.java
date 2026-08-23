package com.enacademy.learning;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class LearningRepository {
    public record ModuleRow(String id, String level, int unit, String title, String description,
                            String outcome, int position) {}
    public record LessonSummary(String id, String level, int unit, String title, String objective,
                                int duration, int xp, int position) {}
    public record LessonDetail(LessonSummary summary, JsonNode content) {}
    public record ProgressRow(String lessonId, boolean completed, int score, int xpEarned, Instant completedAt) {}
    private final JdbcClient jdbc;
    private final ObjectMapper mapper;
    public LearningRepository(JdbcClient jdbc, ObjectMapper mapper) { this.jdbc=jdbc; this.mapper=mapper; }

    public List<ModuleRow> modules() {
        return jdbc.sql("SELECT * FROM course_modules ORDER BY position").query((rs,row) -> new ModuleRow(
            rs.getString("id"),rs.getString("level"),rs.getInt("unit_number"),rs.getString("title"),
            rs.getString("description"),rs.getString("outcome"),rs.getInt("position"))).list();
    }

    public List<LessonSummary> lessonsForModule(String moduleId) {
        return jdbc.sql("SELECT * FROM lessons WHERE module_id=:module ORDER BY position").param("module",moduleId)
            .query((rs,row)->summary(rs)).list();
    }

    public Optional<LessonDetail> lesson(String slug) {
        return jdbc.sql("SELECT * FROM lessons WHERE slug=:slug").param("slug",slug).query((rs,row)-> {
            try { return new LessonDetail(summary(rs), mapper.readTree(rs.getString("content"))); }
            catch (JacksonException exception) { throw new IllegalStateException("Invalid lesson content", exception); }
        }).optional();
    }

    public List<ProgressRow> progress(UUID userId) {
        return jdbc.sql("SELECT * FROM lesson_progress WHERE user_id=:user ORDER BY updated_at")
            .param("user",userId).query((rs,row)->new ProgressRow(rs.getString("lesson_slug"),
                rs.getBoolean("completed"),rs.getInt("score"),rs.getInt("xp_earned"),
                rs.getTimestamp("completed_at")==null?null:rs.getTimestamp("completed_at").toInstant())).list();
    }

    public boolean isUnlocked(UUID userId, String slug) {
        return jdbc.sql("""
            SELECT NOT EXISTS (
              SELECT 1 FROM lessons earlier
              JOIN lessons current ON current.slug=:slug
              LEFT JOIN lesson_progress p ON p.lesson_slug=earlier.slug AND p.user_id=:user AND p.completed=true
              WHERE earlier.position < current.position AND p.id IS NULL
            )
            """).param("slug",slug).param("user",userId).query(Boolean.class).single();
    }

    public void complete(UUID userId, String slug, int score, int xp) {
        jdbc.sql("""
            INSERT INTO lesson_progress(id,user_id,lesson_slug,completed,score,xp_earned,completed_at,updated_at)
            VALUES(:id,:user,:lesson,true,:score,:xp,now(),now())
            ON CONFLICT(user_id,lesson_slug) DO UPDATE SET completed=true,
              score=GREATEST(lesson_progress.score,excluded.score),
              xp_earned=GREATEST(lesson_progress.xp_earned,excluded.xp_earned),completed_at=now(),updated_at=now()
            """).param("id",UUID.randomUUID()).param("user",userId).param("lesson",slug)
            .param("score",score).param("xp",xp).update();
    }

    public List<String> savedWords(UUID userId) {
        return jdbc.sql("SELECT word FROM saved_words WHERE user_id=:user ORDER BY created_at DESC")
            .param("user",userId).query(String.class).list();
    }

    public void saveWord(UUID userId, String word) {
        jdbc.sql("INSERT INTO saved_words(id,user_id,word) VALUES(:id,:user,:word) ON CONFLICT(user_id,word) DO NOTHING")
            .param("id",UUID.randomUUID()).param("user",userId).param("word",word.toLowerCase(java.util.Locale.ROOT)).update();
    }

    public void removeWord(UUID userId, String word) {
        jdbc.sql("DELETE FROM saved_words WHERE user_id=:user AND word=:word")
            .param("user",userId).param("word",word.toLowerCase(java.util.Locale.ROOT)).update();
    }

    public void insertModule(ModuleRow module) {
        jdbc.sql("""
            INSERT INTO course_modules(id,level,unit_number,title,description,outcome,position)
            VALUES(:id,:level,:unit,:title,:description,:outcome,:position) ON CONFLICT(id) DO NOTHING
            """).param("id",module.id()).param("level",module.level()).param("unit",module.unit())
            .param("title",module.title()).param("description",module.description()).param("outcome",module.outcome())
            .param("position",module.position()).update();
    }

    public void insertLesson(String moduleId, LessonSummary lesson, String contentJson) {
        jdbc.sql("""
            INSERT INTO lessons(slug,module_id,level,unit_number,title,objective,duration_minutes,xp,position,content)
            VALUES(:slug,:module,:level,:unit,:title,:objective,:duration,:xp,:position,CAST(:content AS jsonb))
            ON CONFLICT(slug) DO NOTHING
            """).param("slug",lesson.id()).param("module",moduleId).param("level",lesson.level())
            .param("unit",lesson.unit()).param("title",lesson.title()).param("objective",lesson.objective())
            .param("duration",lesson.duration()).param("xp",lesson.xp()).param("position",lesson.position())
            .param("content",contentJson).update();
    }

    private LessonSummary summary(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new LessonSummary(rs.getString("slug"),rs.getString("level"),rs.getInt("unit_number"),
            rs.getString("title"),rs.getString("objective"),rs.getInt("duration_minutes"),
            rs.getInt("xp"),rs.getInt("position"));
    }
}
