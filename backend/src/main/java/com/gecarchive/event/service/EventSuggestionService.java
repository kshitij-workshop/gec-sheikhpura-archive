package com.gecarchive.event.service;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import com.gecarchive.archive.dto.EventRequest;
import com.gecarchive.archive.dto.EventResponse;
import com.gecarchive.archive.service.ArchiveAdminService;
import com.gecarchive.audit.service.AuditService;
import com.gecarchive.common.dto.PageResponse;
import com.gecarchive.common.error.BadRequestException;
import com.gecarchive.common.error.ConflictException;
import com.gecarchive.common.error.ResourceNotFoundException;
import com.gecarchive.common.security.AuthenticatedUser;
import com.gecarchive.common.security.ClientInfo;
import com.gecarchive.event.dto.EventSuggestionRequest;
import com.gecarchive.event.dto.EventSuggestionResponse;
import com.gecarchive.event.dto.EventSuggestionReviewRequest;
import com.gecarchive.event.entity.AcademicYear;
import com.gecarchive.event.entity.Category;
import com.gecarchive.event.entity.Event;
import com.gecarchive.event.entity.EventSuggestion;
import com.gecarchive.event.entity.SuggestionStatus;
import com.gecarchive.event.repository.AcademicYearRepository;
import com.gecarchive.event.repository.CategoryRepository;
import com.gecarchive.event.repository.EventRepository;
import com.gecarchive.event.repository.EventSuggestionRepository;
import com.gecarchive.user.entity.User;
import com.gecarchive.user.repository.UserRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EventSuggestionService {

    private static final int MAX_PAGE_SIZE = 100;

    private final EventSuggestionRepository suggestions;
    private final CategoryRepository categories;
    private final AcademicYearRepository academicYears;
    private final EventRepository events;
    private final UserRepository users;
    private final ArchiveAdminService archive;
    private final AuditService audit;

    public EventSuggestionService(
            EventSuggestionRepository suggestions,
            CategoryRepository categories,
            AcademicYearRepository academicYears,
            EventRepository events,
            UserRepository users,
            ArchiveAdminService archive,
            AuditService audit) {
        this.suggestions = suggestions;
        this.categories = categories;
        this.academicYears = academicYears;
        this.events = events;
        this.users = users;
        this.archive = archive;
        this.audit = audit;
    }

    @Transactional
    public EventSuggestionResponse create(EventSuggestionRequest body, AuthenticatedUser actor, ClientInfo client) {
        Category category = body.categoryId() == null
                ? null
                : categories.findById(body.categoryId())
                        .orElseThrow(() -> new ResourceNotFoundException("Category not found."));
        AcademicYear year = body.academicYearId() == null
                ? null
                : academicYears.findById(body.academicYearId())
                        .orElseThrow(() -> new ResourceNotFoundException("Academic year not found."));

        User suggester = user(actor.id());
        EventSuggestion suggestion = new EventSuggestion();
        suggestion.setSuggestedBy(suggester);
        suggestion.setCategory(category);
        suggestion.setAcademicYear(year);
        suggestion.setTitle(body.title().trim());
        suggestion.setDescription(blankToNull(body.description()));
        suggestion.setApproximateDate(body.approximateDate());
        suggestion.setStatus(SuggestionStatus.PENDING);
        suggestions.save(suggestion);

        audit.record(suggester, "EVENT_SUGGESTION_CREATED", "EVENT_SUGGESTION", suggestion.getId(), null,
                Map.of("title", suggestion.getTitle()), client);
        return EventSuggestionResponse.from(suggestion);
    }

    @Transactional(readOnly = true)
    public PageResponse<EventSuggestionResponse> listMine(UUID userId, int page, int size) {
        Page<EventSuggestion> result = suggestions.findBySuggestedBy_IdOrderByCreatedAtDesc(userId,
                PageRequest.of(Math.max(0, page), bounded(size)));
        return PageResponse.from(result, EventSuggestionResponse::from);
    }

    @Transactional(readOnly = true)
    public PageResponse<EventSuggestionResponse> list(SuggestionStatus status, int page, int size) {
        PageRequest pageable = PageRequest.of(Math.max(0, page), bounded(size),
                Sort.by(Sort.Direction.ASC, "createdAt"));
        Page<EventSuggestion> result = status == null
                ? suggestions.findAllByOrderByCreatedAtAsc(pageable)
                : suggestions.findByStatusOrderByCreatedAtAsc(status, pageable);
        return PageResponse.from(result, EventSuggestionResponse::from);
    }

    @Transactional
    public EventSuggestionResponse review(UUID id, EventSuggestionReviewRequest body, AuthenticatedUser actor,
            ClientInfo client) {
        EventSuggestion suggestion = suggestions.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event suggestion not found."));
        if (suggestion.getStatus() != SuggestionStatus.PENDING) {
            throw new ConflictException("This suggestion has already been reviewed.");
        }
        SuggestionStatus target = body.status();
        if (target != SuggestionStatus.APPROVED && target != SuggestionStatus.REJECTED) {
            throw new BadRequestException("A suggestion must be approved or rejected.");
        }
        boolean createEvent = Boolean.TRUE.equals(body.createEvent());
        if (createEvent && target != SuggestionStatus.APPROVED) {
            throw new BadRequestException("An event can only be created from an approved suggestion.");
        }

        SuggestionStatus from = suggestion.getStatus();
        Event created = createEvent ? materialise(suggestion, actor, client) : null;

        suggestion.setStatus(target);
        suggestion.setReviewNote(blankToNull(body.reviewNote()));
        suggestion.setReviewedBy(user(actor.id()));
        suggestion.setReviewedAt(Instant.now());
        if (created != null) {
            suggestion.setCreatedEvent(created);
        }
        suggestions.save(suggestion);

        Map<String, Object> after = new LinkedHashMap<>();
        after.put("status", target.name());
        if (created != null) {
            after.put("createdEventId", created.getId().toString());
        }
        audit.record(user(actor.id()),
                target == SuggestionStatus.APPROVED ? "EVENT_SUGGESTION_APPROVED" : "EVENT_SUGGESTION_REJECTED",
                "EVENT_SUGGESTION", id, Map.of("status", from.name()), after, client);
        return EventSuggestionResponse.from(suggestion);
    }

    /**
     * Creates an unpublished draft event so nothing reaches the public archive
     * until an administrator publishes it separately.
     */
    private Event materialise(EventSuggestion suggestion, AuthenticatedUser actor, ClientInfo client) {
        if (suggestion.getApproximateDate() == null) {
            throw new BadRequestException(
                    "The suggestion has no approximate date, so an event cannot be created from it.");
        }
        if (suggestion.getCategory() == null) {
            throw new BadRequestException(
                    "The suggestion has no category, so an event cannot be created from it.");
        }
        if (suggestion.getAcademicYear() == null) {
            throw new BadRequestException(
                    "The suggestion has no academic year, so an event cannot be created from it.");
        }
        EventResponse created = archive.createEvent(new EventRequest(
                suggestion.getAcademicYear().getId(),
                suggestion.getCategory().getId(),
                suggestion.getTitle(),
                null,
                suggestion.getDescription(),
                suggestion.getApproximateDate(),
                null,
                false,
                false), actor, client);
        return events.findById(created.id())
                .orElseThrow(() -> new ResourceNotFoundException("Event not found."));
    }

    private User user(UUID id) {
        return users.findById(id).orElseThrow(() -> new ResourceNotFoundException("User not found."));
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private int bounded(int size) {
        return Math.min(Math.max(1, size), MAX_PAGE_SIZE);
    }
}
