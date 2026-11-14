package com.gecarchive.analytics.controller;

import com.gecarchive.analytics.dto.AnalyticsResponse;
import com.gecarchive.analytics.service.AnalyticsService;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/analytics")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class AdminAnalyticsController {

    private final AnalyticsService analytics;

    public AdminAnalyticsController(AnalyticsService analytics) {
        this.analytics = analytics;
    }

    @GetMapping
    public AnalyticsResponse summary() {
        return analytics.summary();
    }
}
