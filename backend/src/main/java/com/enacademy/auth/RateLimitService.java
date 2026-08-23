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
        String key = "login:" + Integer.toHexString((email + ":" + ip).hashCode());
        try {
            Long attempts = redis.opsForValue().increment(key);
            if (attempts != null && attempts == 1) redis.expire(key, Duration.ofMinutes(15));
            if (attempts != null && attempts > 8) {
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "LOGIN_RATE_LIMITED", "Too many attempts. Try again in 15 minutes.");
            }
        } catch (ApiException exception) {
            throw exception;
        } catch (RuntimeException ignored) {
            // PostgreSQL remains the source of truth; authentication stays available if Redis is restarting.
        }
    }

    public void clearLogin(String email, String ip) {
        try { redis.delete("login:" + Integer.toHexString((email + ":" + ip).hashCode())); }
        catch (RuntimeException ignored) { }
    }
}
