package com.enacademy.auth;

import com.enacademy.shared.ApiException;
import java.time.Duration;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class RateLimitService {
    private final StringRedisTemplate redis;
    public RateLimitService(StringRedisTemplate redis) { this.redis = redis; }

    public void checkLogin(String email, String ip) {
        check("login",email,ip,8,Duration.ofMinutes(15),"LOGIN_RATE_LIMITED","Too many attempts. Try again in 15 minutes.");
    }

    public void checkPasswordReset(String email,String ip) {
        check("password-reset",email,ip,5,Duration.ofMinutes(15),"PASSWORD_RESET_RATE_LIMITED","Too many reset requests. Try again in 15 minutes.");
    }

    public void checkVerificationResend(String email,String ip) {
        check("verification-resend",email,ip,3,Duration.ofMinutes(15),"VERIFICATION_RESEND_RATE_LIMITED","Too many verification requests. Try again in 15 minutes.");
    }

    private void check(String action,String email,String ip,long limit,Duration window,String code,String message) {
        String key=key(action,email,ip);
        try {
            Long attempts = redis.opsForValue().increment(key);
            if(attempts!=null&&attempts==1)redis.expire(key,window);
            if(attempts!=null&&attempts>limit)throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,code,message);
        } catch (ApiException exception) {
            throw exception;
        } catch (RuntimeException ignored) {
            // PostgreSQL remains the source of truth; authentication stays available if Redis is restarting.
        }
    }

    public void clearLogin(String email, String ip) {
        try { redis.delete(key("login",email,ip)); }
        catch (RuntimeException ignored) { }
    }

    private String key(String action,String email,String ip) {
        return action+":"+AuthService.hash(email+":"+ip);
    }
}
