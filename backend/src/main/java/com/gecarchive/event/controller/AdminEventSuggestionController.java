package com.gecarchive.event.controller;

import java.util.UUID;

import com.gecarchive.common.dto.PageResponse;
import com.gecarchive.common.security.AuthenticatedUser;
import com.gecarchive.common.security.ClientInfo;
import com.gecarchive.event.dto.EventSuggestionResponse;
import com.gecarchive.event.dto.EventSuggestionReviewRequest;
import com.gecarchive.event.entity.SuggestionStatus;
import com.gecarchive.event.service.EventSuggestionService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/event-suggestions")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class AdminEventSuggestionController {

    private final EventSuggestionService suggestions;

    public AdminEventSuggestionController(EventSuggestionService suggestions) {
        this.suggestions = suggestions;
    }

    @GetMapping
    public PageResponse<EventSuggestionResponse> list(
            @RequestParam(required = false) SuggestionStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size) {
        return suggestions.list(status, page, size);
    }

    @PatchMapping("/{id}")
    public EventSuggestionResponse review(@PathVariable UUID id,
            @Valid @RequestBody EventSuggestionReviewRequest request,
            @AuthenticationPrincipal AuthenticatedUser actor, HttpServletRequest httpRequest) {
        return suggestions.review(id, request, actor, ClientInfo.from(httpRequest));
    }
}
