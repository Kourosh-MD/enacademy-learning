package com.enacademy.shared;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter extends OncePerRequestFilter {
    public static final String HEADER="X-Request-ID";
    private static final Pattern SAFE=Pattern.compile("[A-Za-z0-9._-]{8,100}");
    private static final Logger LOG=LoggerFactory.getLogger(CorrelationIdFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain)
        throws ServletException,IOException {
        String supplied=request.getHeader(HEADER);
        String requestId=supplied!=null&&SAFE.matcher(supplied).matches()?supplied:UUID.randomUUID().toString();
        long started=System.nanoTime();
        MDC.put("requestId",requestId);
        request.setAttribute("requestId",requestId);
        response.setHeader(HEADER,requestId);
        try {
            chain.doFilter(request,response);
        } finally {
            long durationMs=(System.nanoTime()-started)/1_000_000;
            if(request.getRequestURI().startsWith("/actuator/health")) {
                LOG.debug("http_request_completed method={} path={} status={} durationMs={}",
                    request.getMethod(),request.getRequestURI(),response.getStatus(),durationMs);
            } else {
                LOG.info("http_request_completed method={} path={} status={} durationMs={}",
                    request.getMethod(),request.getRequestURI(),response.getStatus(),durationMs);
            }
            MDC.remove("requestId");
        }
    }
}
