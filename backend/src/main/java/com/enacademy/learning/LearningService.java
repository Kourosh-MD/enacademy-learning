package com.enacademy.learning;

import com.enacademy.auth.AuthService;
import com.enacademy.domain.UserAccount;
import com.enacademy.shared.ApiException;
import com.enacademy.shared.AuditService;
import tools.jackson.databind.JsonNode;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LearningService {
    public record ModuleView(String id,String level,int unit,String title,String description,String outcome,
                             List<LearningRepository.LessonSummary> lessons) {}
    public record CurriculumView(List<ModuleView> modules,int lessonCount,int totalMinutes) {}
    public record LessonView(LearningRepository.LessonSummary lesson, JsonNode content, boolean unlocked) {}
    public record DashboardView(com.enacademy.auth.AuthModels.UserView user,
                                List<LearningRepository.ProgressRow> progress,List<String> savedWords,
                                int totalXp,int completedLessons,int totalLessons) {}
    public record CompleteRequest(@Min(0) @Max(100) int score) {}
    public record WordRequest(@NotBlank @Size(max=100) String word, boolean save) {}

    private final LearningRepository learning; private final AuthService auth; private final AuditService audit;
    public LearningService(LearningRepository learning,AuthService auth,AuditService audit) {
        this.learning=learning;this.auth=auth;this.audit=audit;
    }

    public CurriculumView curriculum() {
        var modules=learning.modules().stream().map(module->new ModuleView(module.id(),module.level(),module.unit(),
            module.title(),module.description(),module.outcome(),learning.lessonsForModule(module.id()))).toList();
        var lessons=modules.stream().flatMap(module->module.lessons().stream()).toList();
        return new CurriculumView(modules,lessons.size(),lessons.stream().mapToInt(LearningRepository.LessonSummary::duration).sum());
    }

    public DashboardView dashboard(String subject) {
        var user=requireApproved(subject); var progress=learning.progress(user.id());
        int total=curriculum().lessonCount();
        return new DashboardView(com.enacademy.auth.AuthModels.UserView.from(user),progress,learning.savedWords(user.id()),
            progress.stream().mapToInt(LearningRepository.ProgressRow::xpEarned).sum(),
            (int)progress.stream().filter(LearningRepository.ProgressRow::completed).count(),total);
    }

    public LessonView lesson(String subject,String slug) {
        var user=requireApproved(subject);
        var lesson=learning.lesson(slug).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"LESSON_NOT_FOUND","Lesson not found."));
        return new LessonView(lesson.summary(),lesson.content(),learning.isUnlocked(user.id(),slug));
    }

    @Transactional
    public DashboardView complete(String subject,String slug,int score) {
        var user=requireApproved(subject);
        var lesson=learning.lesson(slug).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"LESSON_NOT_FOUND","Lesson not found."));
        if(!learning.isUnlocked(user.id(),slug)) throw new ApiException(HttpStatus.CONFLICT,"LESSON_LOCKED","Complete the earlier lessons first.");
        learning.complete(user.id(),slug,score,lesson.summary().xp());
        audit.record(user.id(),"LESSON_COMPLETED","LESSON",slug,Map.of("score",score,"xp",lesson.summary().xp()));
        return dashboard(subject);
    }

    public List<String> words(String subject) { return learning.savedWords(requireApproved(subject).id()); }
    @Transactional public List<String> updateWord(String subject,WordRequest request) {
        var user=requireApproved(subject); String word=request.word().trim();
        if(request.save()) learning.saveWord(user.id(),word); else learning.removeWord(user.id(),word);
        return learning.savedWords(user.id());
    }

    private UserAccount requireApproved(String subject) {
        var user=auth.requireUser(subject);
        if(!user.emailVerified()||!user.approved()) throw new ApiException(HttpStatus.FORBIDDEN,"ACCOUNT_NOT_APPROVED","Administrator approval is required.");
        return user;
    }
}
