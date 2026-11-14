package com.gecarchive.moderation.controller;

import java.util.UUID;

import com.gecarchive.common.security.AuthenticatedUser;
import com.gecarchive.common.security.ClientInfo;
import com.gecarchive.moderation.dto.ReportRequest;
import com.gecarchive.moderation.dto.ReportResponse;
import com.gecarchive.moderation.service.PhotoReportService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/photos")
public class PhotoReportController {

    private final PhotoReportService reports;

    public PhotoReportController(PhotoReportService reports) {
        this.reports = reports;
    }

    @PostMapping("/{photoId}/reports")
    public ResponseEntity<ReportResponse> report(
            @PathVariable UUID photoId,
            @Valid @RequestBody ReportRequest request,
            @AuthenticationPrincipal AuthenticatedUser actor,
            HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reports.report(photoId, request, actor, ClientInfo.from(httpRequest)));
    }
}
