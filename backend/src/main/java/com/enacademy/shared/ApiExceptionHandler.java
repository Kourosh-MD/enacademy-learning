package com.enacademy.shared;

import java.net.URI;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger LOG=LoggerFactory.getLogger(ApiExceptionHandler.class);
    @ExceptionHandler(ApiException.class)
    ProblemDetail handle(ApiException exception) {
        var problem = ProblemDetail.forStatusAndDetail(exception.status(), exception.getMessage());
        problem.setTitle("Request could not be completed");
        problem.setType(URI.create("https://enacademy.dev/problems/" + exception.code().toLowerCase()));
        problem.setProperty("code", exception.code());
        addRequestId(problem);
        return problem;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ProblemDetail handleValidation(MethodArgumentNotValidException exception) {
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Check the highlighted fields and try again.");
        problem.setTitle("Validation failed");
        problem.setProperty("code", "VALIDATION_FAILED");
        problem.setProperty("errors", exception.getBindingResult().getFieldErrors().stream()
            .collect(java.util.stream.Collectors.toMap(FieldError::getField, FieldError::getDefaultMessage,
                (first, ignored) -> first)));
        addRequestId(problem);
        return problem;
    }

    @ExceptionHandler(Exception.class)
    ProblemDetail handleUnexpected(Exception exception) {
        LOG.error("unhandled_request_exception",exception);
        var problem=ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR,
            "The request could not be completed. Use the request ID when contacting support.");
        problem.setTitle("Unexpected server error");
        problem.setProperty("code","INTERNAL_ERROR");
        addRequestId(problem);
        return problem;
    }

    private void addRequestId(ProblemDetail problem) {
        String requestId=MDC.get("requestId");
        if(requestId!=null)problem.setProperty("requestId",requestId);
    }
}
