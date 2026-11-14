package com.gecarchive.event.controller;

import com.gecarchive.common.dto.PageResponse;
import com.gecarchive.common.security.AuthenticatedUser;
import com.gecarchive.common.security.ClientInfo;
import com.gecarchive.event.dto.EventSuggestionRequest;
import com.gecarchive.event.dto.EventSuggestionResponse;
import com.gecarchive.event.service.EventSuggestionService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me/event-suggestions")
public class EventSuggestionController {

    private final EventSuggestionService suggestions;

    public EventSuggestionController(EventSuggestionService suggestions) {
        this.suggestions = suggestions;
    }

    @GetMapping
    public PageResponse<EventSuggestionResponse> mine(
            @AuthenticationPrincipal AuthenticatedUser actor,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size) {
        return suggestions.listMine(actor.id(), page, size);
    }

    @PostMapping
    public ResponseEntity<EventSuggestionResponse> suggest(
            @AuthenticationPrincipal AuthenticatedUser actor,
            @Valid @RequestBody EventSuggestionRequest request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(suggestions.create(request, actor, ClientInfo.from(httpRequest)));
    }
}
