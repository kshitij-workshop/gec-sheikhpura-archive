package com.gecarchive.upload.controller;

import java.util.UUID;

import com.gecarchive.common.dto.PageResponse;
import com.gecarchive.common.security.AuthenticatedUser;
import com.gecarchive.common.security.ClientInfo;
import com.gecarchive.upload.dto.AuthorizeUploadRequest;
import com.gecarchive.upload.dto.CreateSubmissionRequest;
import com.gecarchive.upload.dto.PhotoResponse;
import com.gecarchive.upload.dto.RegisterPhotoRequest;
import com.gecarchive.upload.dto.SubmissionResponse;
import com.gecarchive.upload.dto.UploadAuthorizationResponse;
import com.gecarchive.upload.service.UploadService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me")
public class UploadController {

    private final UploadService uploads;

    public UploadController(UploadService uploads) {
        this.uploads = uploads;
    }

    @PostMapping("/submissions")
    public ResponseEntity<SubmissionResponse> createSubmission(
            @AuthenticationPrincipal AuthenticatedUser actor,
            @Valid @RequestBody CreateSubmissionRequest request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(uploads.createSubmission(request, actor, ClientInfo.from(httpRequest)));
    }

    @GetMapping("/submissions")
    public PageResponse<SubmissionResponse> submissions(
            @AuthenticationPrincipal AuthenticatedUser actor,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size) {
        return uploads.listSubmissions(actor, page, size);
    }

    @PostMapping("/uploads/authorize")
    public UploadAuthorizationResponse authorizeUpload(
            @AuthenticationPrincipal AuthenticatedUser actor,
            @Valid @RequestBody AuthorizeUploadRequest request,
            HttpServletRequest httpRequest) {
        return uploads.authorize(request, actor, ClientInfo.from(httpRequest));
    }

    @PostMapping("/submissions/{submissionId}/photos")
    public ResponseEntity<PhotoResponse> registerPhoto(
            @AuthenticationPrincipal AuthenticatedUser actor,
            @PathVariable UUID submissionId,
            @Valid @RequestBody RegisterPhotoRequest request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(uploads.registerPhoto(submissionId, request, actor, ClientInfo.from(httpRequest)));
    }
}
