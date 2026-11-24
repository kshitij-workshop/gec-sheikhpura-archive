package com.gecarchive.moderation.controller;

import java.util.List;
import java.util.UUID;

import com.gecarchive.common.dto.PageResponse;
import com.gecarchive.common.security.AuthenticatedUser;
import com.gecarchive.common.security.ClientInfo;
import com.gecarchive.moderation.dto.ModerationActionRequest;
import com.gecarchive.moderation.dto.ModerationHistoryEntryResponse;
import com.gecarchive.moderation.dto.ModerationPhotoResponse;
import com.gecarchive.moderation.dto.RemovalRequestResolutionRequest;
import com.gecarchive.moderation.dto.RemovalRequestResponse;
import com.gecarchive.moderation.dto.ReportResolutionRequest;
import com.gecarchive.moderation.dto.ReportResponse;
import com.gecarchive.moderation.dto.UpdatePhotoRequest;
import com.gecarchive.moderation.entity.ModerationAction;
import com.gecarchive.moderation.entity.RemovalRequestStatus;
import com.gecarchive.moderation.entity.ReportCategory;
import com.gecarchive.moderation.entity.ReportStatus;
import com.gecarchive.moderation.service.PhotoModerationService;
import com.gecarchive.moderation.service.PhotoRemovalRequestService;
import com.gecarchive.moderation.service.PhotoReportService;
import com.gecarchive.photo.entity.PhotoStatus;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class AdminModerationController {

    private final PhotoModerationService moderation;
    private final PhotoReportService reports;
    private final PhotoRemovalRequestService removalRequests;

    public AdminModerationController(
            PhotoModerationService moderation,
            PhotoReportService reports,
            PhotoRemovalRequestService removalRequests) {
        this.moderation = moderation;
        this.reports = reports;
        this.removalRequests = removalRequests;
    }

    @GetMapping("/moderation/photos")
    public PageResponse<ModerationPhotoResponse> queue(
            @RequestParam(required = false) PhotoStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size) {
        return moderation.queue(status, page, size);
    }

    @GetMapping("/photos/{id}/moderation-history")
    public List<ModerationHistoryEntryResponse> history(@PathVariable UUID id) {
        return moderation.history(id);
    }

    /**
     * One photograph as moderators see it. Used by public-page admin controls
     * that need the current status before choosing a transition.
     */
    @GetMapping("/photos/{id}")
    public ModerationPhotoResponse photo(@PathVariable UUID id) {
        return moderation.details(id);
    }

    @PatchMapping("/photos/{id}")
    public ModerationPhotoResponse updatePhoto(@PathVariable UUID id,
            @Valid @RequestBody UpdatePhotoRequest request,
            @AuthenticationPrincipal AuthenticatedUser actor, HttpServletRequest httpRequest) {
        return moderation.updateDetails(id, request, actor, ClientInfo.from(httpRequest));
    }

    @PostMapping("/photos/{id}/approve")
    public ModerationPhotoResponse approve(@PathVariable UUID id,
            @Valid @RequestBody(required = false) ModerationActionRequest request,
            @AuthenticationPrincipal AuthenticatedUser actor, HttpServletRequest httpRequest) {
        return moderation.moderate(id, ModerationAction.APPROVE, request, actor, ClientInfo.from(httpRequest));
    }

    @PostMapping("/photos/{id}/reject")
    public ModerationPhotoResponse reject(@PathVariable UUID id,
            @Valid @RequestBody(required = false) ModerationActionRequest request,
            @AuthenticationPrincipal AuthenticatedUser actor, HttpServletRequest httpRequest) {
        return moderation.moderate(id, ModerationAction.REJECT, request, actor, ClientInfo.from(httpRequest));
    }

    @PostMapping("/photos/{id}/flag")
    public ModerationPhotoResponse flag(@PathVariable UUID id,
            @Valid @RequestBody(required = false) ModerationActionRequest request,
            @AuthenticationPrincipal AuthenticatedUser actor, HttpServletRequest httpRequest) {
        return moderation.moderate(id, ModerationAction.FLAG, request, actor, ClientInfo.from(httpRequest));
    }

    @PostMapping("/photos/{id}/hide")
    public ModerationPhotoResponse hide(@PathVariable UUID id,
            @Valid @RequestBody(required = false) ModerationActionRequest request,
            @AuthenticationPrincipal AuthenticatedUser actor, HttpServletRequest httpRequest) {
        return moderation.moderate(id, ModerationAction.HIDE, request, actor, ClientInfo.from(httpRequest));
    }

    @PostMapping("/photos/{id}/remove")
    public ModerationPhotoResponse remove(@PathVariable UUID id,
            @Valid @RequestBody(required = false) ModerationActionRequest request,
            @AuthenticationPrincipal AuthenticatedUser actor, HttpServletRequest httpRequest) {
        return moderation.moderate(id, ModerationAction.REMOVE, request, actor, ClientInfo.from(httpRequest));
    }

    @PostMapping("/photos/{id}/restore")
    public ModerationPhotoResponse restore(@PathVariable UUID id,
            @Valid @RequestBody(required = false) ModerationActionRequest request,
            @AuthenticationPrincipal AuthenticatedUser actor, HttpServletRequest httpRequest) {
        return moderation.moderate(id, ModerationAction.RESTORE, request, actor, ClientInfo.from(httpRequest));
    }

    @GetMapping("/reports")
    public PageResponse<ReportResponse> reports(
            @RequestParam(required = false) ReportStatus status,
            @RequestParam(required = false) ReportCategory category,
            @RequestParam(required = false) UUID eventId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size) {
        return reports.list(status, category, eventId, page, size);
    }

    @PatchMapping("/reports/{id}")
    public ReportResponse resolveReport(@PathVariable UUID id,
            @Valid @RequestBody ReportResolutionRequest request,
            @AuthenticationPrincipal AuthenticatedUser actor, HttpServletRequest httpRequest) {
        return reports.resolve(id, request, actor, ClientInfo.from(httpRequest));
    }

    @GetMapping("/removal-requests")
    public PageResponse<RemovalRequestResponse> removalRequests(
            @RequestParam(required = false) RemovalRequestStatus status,
            @RequestParam(required = false) UUID eventId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size) {
        return removalRequests.list(status, eventId, page, size);
    }

    @PatchMapping("/removal-requests/{id}")
    public RemovalRequestResponse resolveRemovalRequest(@PathVariable UUID id,
            @Valid @RequestBody RemovalRequestResolutionRequest request,
            @AuthenticationPrincipal AuthenticatedUser actor, HttpServletRequest httpRequest) {
        return removalRequests.resolve(id, request, actor, ClientInfo.from(httpRequest));
    }
}
