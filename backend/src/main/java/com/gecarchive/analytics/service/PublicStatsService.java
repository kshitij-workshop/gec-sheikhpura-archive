package com.gecarchive.analytics.service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

import com.gecarchive.analytics.dto.PublicStatsResponse;
import com.gecarchive.analytics.dto.VisitRequest;
import com.gecarchive.analytics.repository.VisitorDayRepository;
import com.gecarchive.auth.repository.RefreshTokenRepository;
import com.gecarchive.user.entity.UserStatus;
import com.gecarchive.user.repository.UserRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Aggregate archive statistics exposed to anonymous visitors.
 *
 * <p>{@code totalVisitors} counts distinct anonymous visitor identifiers,
 * {@code registeredUsers} counts verified accounts, and {@code activeUsers}
 * counts accounts holding a refresh session issued inside the activity window,
 * which approximates who is signed in right now without tracking every
 * request.</p>
 */
@Service
public class PublicStatsService {

    static final Duration ACTIVE_WINDOW = Duration.ofMinutes(30);

    private final VisitorDayRepository visitors;
    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;

    public PublicStatsService(
            VisitorDayRepository visitors,
            UserRepository users,
            RefreshTokenRepository refreshTokens) {
        this.visitors = visitors;
        this.users = users;
        this.refreshTokens = refreshTokens;
    }

    @Transactional
    public void recordVisit(VisitRequest request) {
        visitors.recordVisit(request.visitorId(), LocalDate.now(ZoneOffset.UTC));
    }

    @Transactional(readOnly = true)
    public PublicStatsResponse summary() {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        return new PublicStatsResponse(
                visitors.countDistinctVisitors(),
                visitors.countByVisitDate(today),
                users.countByStatus(UserStatus.ACTIVE),
                refreshTokens.countUsersActiveSince(Instant.now().minus(ACTIVE_WINDOW)),
                Instant.now());
    }
}
