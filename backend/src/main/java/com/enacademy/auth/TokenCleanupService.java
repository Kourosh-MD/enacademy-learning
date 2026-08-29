package com.enacademy.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TokenCleanupService {
    private static final Logger LOG=LoggerFactory.getLogger(TokenCleanupService.class);
    private final TokenRepository tokens;
    private final int retentionDays;

    public TokenCleanupService(TokenRepository tokens,@Value("${app.auth.token-retention-days:7}") int retentionDays) {
        this.tokens=tokens;this.retentionDays=retentionDays;
    }

    @Scheduled(cron="${app.auth.token-cleanup-cron:0 20 3 * * *}",zone="UTC")
    @Transactional
    public void removeInactiveTokens() {
        var result=tokens.cleanup(retentionDays);
        LOG.info("token_cleanup_completed verificationTokens={} refreshTokens={} passwordResetTokens={} total={}",
            result.verificationTokens(),result.refreshTokens(),result.passwordResetTokens(),result.total());
    }
}
