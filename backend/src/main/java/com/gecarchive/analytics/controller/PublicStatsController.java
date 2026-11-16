package com.gecarchive.analytics.controller;

import com.gecarchive.analytics.dto.PublicStatsResponse;
import com.gecarchive.analytics.dto.VisitRequest;
import com.gecarchive.analytics.service.PublicStatsService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public-stats")
public class PublicStatsController {

    private final PublicStatsService stats;

    public PublicStatsController(PublicStatsService stats) {
        this.stats = stats;
    }

    @GetMapping
    public PublicStatsResponse summary() {
        return stats.summary();
    }

    /**
     * Records one anonymous visit for the current UTC day. Repeat submissions of
     * the same identifier are idempotent, so the browser can call this freely.
     */
    @PostMapping("/visits")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void recordVisit(@Valid @RequestBody VisitRequest request) {
        stats.recordVisit(request);
    }
}
