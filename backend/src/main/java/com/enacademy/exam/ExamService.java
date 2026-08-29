package com.enacademy.exam;

import com.enacademy.auth.AuthService;
import com.enacademy.domain.Role;
import com.enacademy.shared.ApiException;
import com.enacademy.shared.AuditService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

@Service
public class ExamService {
    public record OptionView(String id,String textEn,String textFa) {}
    public record QuestionView(UUID id,int position,String promptEn,String promptFa,List<OptionView> options,
                               int points,String correctOption,String explanationEn,String explanationFa) {}
    public record ExamSummary(UUID id,String slug,String titleEn,String titleFa,String descriptionEn,
                              String descriptionFa,String level,int durationMinutes,int passingScore,
                              String startsAt,String endsAt,String availability,boolean entitled,int questionCount,
                              UUID attemptId,String attemptStatus,Integer percentage,Boolean passed) {}
    public record AnswerInput(@NotNull UUID questionId,@NotBlank @Size(max=20) String selectedOption) {}
    public record SaveAnswersRequest(@NotEmpty @Size(max=100) List<@Valid AnswerInput> answers) {}
    public record AttemptState(UUID attemptId,String status,String serverTime,String deadlineAt,long remainingSeconds,
                               String lastSavedAt,int version,Integer scorePoints,Integer maxPoints,
                               Integer percentage,Boolean passed) {}
    public record AttemptView(UUID attemptId,ExamSummary exam,String status,String startedAt,String deadlineAt,
                              String submittedAt,String serverTime,long remainingSeconds,int version,
                              Integer scorePoints,Integer maxPoints,Integer percentage,Boolean passed,
                              List<QuestionView> questions,Map<UUID,String> answers) {}
    public record AdminMetrics(long exams,long published,long attempts,long submitted,int averagePercentage) {}
    public record AdminOverview(AdminMetrics metrics,List<ExamRepository.AdminExamRow> exams,
                                List<ExamRepository.AdminAttemptRow> attempts) {}
    public record AdminUpdateRequest(boolean published,@NotNull Instant startsAt,@NotNull Instant endsAt,
                                     @Min(5) @Max(240) int durationMinutes,
                                     @Min(0) @Max(100) int passingScore) {}

    private final ExamRepository exams;
    private final AuthService auth;
    private final AuditService audit;
    private final ObjectMapper objectMapper;

    public ExamService(ExamRepository exams,AuthService auth,AuditService audit,ObjectMapper objectMapper) {
        this.exams=exams;this.auth=auth;this.audit=audit;this.objectMapper=objectMapper;
    }

    @Transactional
    public List<ExamSummary> list(String subject) {
        var user=requireApprovedStudent(subject);
        return exams.examsForUser(user.id()).stream().map(row->{
            if(row.attemptId()!=null&&"IN_PROGRESS".equals(row.attemptStatus())) {
                var attempt=exams.attemptForUser(row.attemptId(),user.id()).orElseThrow();
                if(expired(attempt)) finalizeAttempt(attempt,user.id(),true);
            }
            return summary(exams.exam(row.id(),user.id()).orElseThrow());
        }).toList();
    }

    @Transactional
    public AttemptView start(String subject,String slug) {
        var user=requireApprovedStudent(subject);
        var exam=exams.examBySlug(slug,user.id()).orElseThrow(()->notFound("EXAM_NOT_FOUND","Exam not found."));
        requireStartable(exam);
        if(exam.questionCount()==0) {
            throw new ApiException(HttpStatus.CONFLICT,"EXAM_EMPTY","This exam has no questions.");
        }
        Instant now=Instant.now();
        Instant deadline=now.plus(Duration.ofMinutes(exam.durationMinutes()));
        if(deadline.isAfter(exam.endsAt())) deadline=exam.endsAt();
        var created=exams.createOrGetAttempt(exam.id(),user.id(),deadline);
        var attempt=created.attempt();
        if(created.created()) {
            audit.record(user.id(),"EXAM_STARTED","EXAM_ATTEMPT",attempt.id().toString(),
                Map.of("examId",exam.id(),"deadlineAt",attempt.deadlineAt()));
        }
        if("IN_PROGRESS".equals(attempt.status())&&expired(attempt)) {
            attempt=finalizeAttempt(exams.lockAttempt(attempt.id(),user.id()).orElseThrow(),user.id(),true);
        }
        return view(exam,attempt);
    }

    @Transactional
    public AttemptView attempt(String subject,UUID attemptId) {
        var user=requireApprovedStudent(subject);
        var attempt=exams.lockAttempt(attemptId,user.id()).orElseThrow(()->notFound("ATTEMPT_NOT_FOUND","Exam attempt not found."));
        if("IN_PROGRESS".equals(attempt.status())&&expired(attempt)) {
            attempt=finalizeAttempt(attempt,user.id(),true);
        }
        var exam=exams.exam(attempt.examId(),user.id()).orElseThrow();
        return view(exam,attempt);
    }

    @Transactional
    public AttemptState save(String subject,UUID attemptId,SaveAnswersRequest request) {
        var user=requireApprovedStudent(subject);
        var attempt=exams.lockAttempt(attemptId,user.id()).orElseThrow(()->notFound("ATTEMPT_NOT_FOUND","Exam attempt not found."));
        if(!"IN_PROGRESS".equals(attempt.status())) return state(attempt);
        if(expired(attempt)) return state(finalizeAttempt(attempt,user.id(),true));

        var questions=exams.questions(attempt.examId());
        var byId=new LinkedHashMap<UUID,ExamRepository.QuestionRow>();
        questions.forEach(question->byId.put(question.id(),question));
        var seen=new LinkedHashSet<UUID>();
        for(var answer:request.answers()) {
            if(!seen.add(answer.questionId())) {
                throw new ApiException(HttpStatus.BAD_REQUEST,"DUPLICATE_ANSWER","A question appears more than once.");
            }
            var question=byId.get(answer.questionId());
            if(question==null||optionIds(question).stream().noneMatch(answer.selectedOption()::equals)) {
                throw new ApiException(HttpStatus.BAD_REQUEST,"INVALID_EXAM_ANSWER","An answer is not valid for this exam.");
            }
        }
        try {
            exams.upsertAnswers(attempt.id(),objectMapper.writeValueAsString(request.answers()));
        } catch(JacksonException exception) {
            throw new IllegalStateException("Could not encode exam answers",exception);
        }
        exams.touchAttempt(attempt.id());
        return state(exams.attemptForUser(attempt.id(),user.id()).orElseThrow());
    }

    @Transactional
    public AttemptView submit(String subject,UUID attemptId) {
        var user=requireApprovedStudent(subject);
        var attempt=exams.lockAttempt(attemptId,user.id()).orElseThrow(()->notFound("ATTEMPT_NOT_FOUND","Exam attempt not found."));
        if("IN_PROGRESS".equals(attempt.status())) {
            attempt=finalizeAttempt(attempt,user.id(),expired(attempt));
        }
        var exam=exams.exam(attempt.examId(),user.id()).orElseThrow();
        return view(exam,attempt);
    }

    public AdminOverview adminOverview() {
        return new AdminOverview(new AdminMetrics(exams.examCount(),exams.publishedCount(),exams.attemptCount(),
            exams.submittedCount(),exams.averagePercentage()),exams.adminExams(),exams.recentAttempts());
    }

    @Transactional
    public AdminOverview updateExam(UUID actor,UUID examId,AdminUpdateRequest request) {
        if(!request.endsAt().isAfter(request.startsAt())) {
            throw new ApiException(HttpStatus.BAD_REQUEST,"INVALID_EXAM_WINDOW","Exam end time must be after its start time.");
        }
        exams.updateExam(examId,request.published(),request.startsAt(),request.endsAt(),
            request.durationMinutes(),request.passingScore());
        audit.record(actor,"EXAM_UPDATED","EXAM",examId.toString(),Map.of(
            "published",request.published(),"startsAt",request.startsAt(),"endsAt",request.endsAt(),
            "durationMinutes",request.durationMinutes(),"passingScore",request.passingScore()));
        return adminOverview();
    }

    private ExamRepository.AttemptRow finalizeAttempt(ExamRepository.AttemptRow attempt,UUID actor,boolean automatic) {
        if(!"IN_PROGRESS".equals(attempt.status())) return attempt;
        var exam=exams.exam(attempt.examId(),attempt.userId()).orElseThrow();
        var grade=exams.grade(attempt.id(),attempt.examId());
        int percentage=grade.maxPoints()==0?0:(int)Math.round(grade.scorePoints()*100.0/grade.maxPoints());
        boolean passed=percentage>=exam.passingScore();
        var submitted=exams.submit(attempt.id(),automatic?"AUTO_SUBMITTED":"SUBMITTED",grade,percentage,passed);
        audit.record(actor,automatic?"EXAM_AUTO_SUBMITTED":"EXAM_SUBMITTED","EXAM_ATTEMPT",attempt.id().toString(),
            Map.of("examId",attempt.examId(),"percentage",percentage,"passed",passed));
        return submitted;
    }

    private AttemptView view(ExamRepository.ExamRow exam,ExamRepository.AttemptRow attempt) {
        boolean finished=!"IN_PROGRESS".equals(attempt.status());
        var questionViews=exams.questions(exam.id()).stream().map(question->new QuestionView(
            question.id(),question.position(),question.promptEn(),question.promptFa(),options(question),question.points(),
            finished?question.correctOption():null,finished?question.explanationEn():null,
            finished?question.explanationFa():null)).toList();
        var answers=new LinkedHashMap<UUID,String>();
        exams.answers(attempt.id()).forEach(answer->answers.put(answer.questionId(),answer.selectedOption()));
        Instant now=Instant.now();
        return new AttemptView(attempt.id(),summary(exam),attempt.status(),attempt.startedAt().toString(),
            attempt.deadlineAt().toString(),string(attempt.submittedAt()),now.toString(),
            remaining(attempt,now),attempt.version(),attempt.scorePoints(),attempt.maxPoints(),attempt.percentage(),
            attempt.passed(),questionViews,answers);
    }

    private AttemptState state(ExamRepository.AttemptRow attempt) {
        Instant now=Instant.now();
        return new AttemptState(attempt.id(),attempt.status(),now.toString(),attempt.deadlineAt().toString(),
            remaining(attempt,now),string(attempt.lastSavedAt()),attempt.version(),attempt.scorePoints(),
            attempt.maxPoints(),attempt.percentage(),attempt.passed());
    }

    private ExamSummary summary(ExamRepository.ExamRow exam) {
        Instant now=Instant.now();
        String availability=!exam.published()?"HIDDEN":now.isBefore(exam.startsAt())?"UPCOMING":
            !now.isBefore(exam.endsAt())?"CLOSED":!exam.entitled()?"LOCKED":"OPEN";
        return new ExamSummary(exam.id(),exam.slug(),exam.titleEn(),exam.titleFa(),exam.descriptionEn(),
            exam.descriptionFa(),exam.level(),exam.durationMinutes(),exam.passingScore(),
            exam.startsAt().toString(),exam.endsAt().toString(),availability,exam.entitled(),
            exam.questionCount(),exam.attemptId(),exam.attemptStatus(),exam.percentage(),exam.passed());
    }

    private void requireStartable(ExamRepository.ExamRow exam) {
        Instant now=Instant.now();
        if(!exam.published()||now.isBefore(exam.startsAt())||!now.isBefore(exam.endsAt())) {
            throw new ApiException(HttpStatus.CONFLICT,"EXAM_NOT_AVAILABLE","This exam is not currently available.");
        }
        if(!exam.entitled()) {
            throw new ApiException(HttpStatus.FORBIDDEN,"COURSE_REQUIRED","Purchase the matching course before taking its exam.");
        }
    }

    private com.enacademy.domain.UserAccount requireApprovedStudent(String subject) {
        var user=auth.requireUser(subject);
        if(user.role()!=Role.STUDENT||!user.approved()||!user.emailVerified()) {
            throw new ApiException(HttpStatus.FORBIDDEN,"ACCOUNT_NOT_APPROVED","An approved student account is required.");
        }
        return user;
    }

    private List<OptionView> options(ExamRepository.QuestionRow question) {
        try {
            return objectMapper.readValue(question.optionsJson(),new TypeReference<List<OptionView>>(){});
        } catch(JacksonException exception) {
            throw new IllegalStateException("Could not read exam options",exception);
        }
    }

    private List<String> optionIds(ExamRepository.QuestionRow question) {
        return options(question).stream().map(OptionView::id).toList();
    }

    private boolean expired(ExamRepository.AttemptRow attempt){return !Instant.now().isBefore(attempt.deadlineAt());}
    private long remaining(ExamRepository.AttemptRow attempt,Instant now){
        return "IN_PROGRESS".equals(attempt.status())?Math.max(0,Duration.between(now,attempt.deadlineAt()).toSeconds()):0;
    }
    private String string(Instant value){return value==null?null:value.toString();}
    private ApiException notFound(String code,String message){return new ApiException(HttpStatus.NOT_FOUND,code,message);}
}
