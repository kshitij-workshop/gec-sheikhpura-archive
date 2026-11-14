package com.gecarchive.moderation.service;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import com.gecarchive.audit.service.AuditService;
import com.gecarchive.common.dto.PageResponse;
import com.gecarchive.common.error.BadRequestException;
import com.gecarchive.common.error.ConflictException;
import com.gecarchive.common.error.ResourceNotFoundException;
import com.gecarchive.common.security.AuthenticatedUser;
import com.gecarchive.common.security.ClientInfo;
import com.gecarchive.moderation.dto.ModerationActionRequest;
import com.gecarchive.moderation.dto.RemovalRequestRequest;
import com.gecarchive.moderation.dto.RemovalRequestResolutionRequest;
import com.gecarchive.moderation.dto.RemovalRequestResponse;
import com.gecarchive.moderation.entity.ModerationAction;
import com.gecarchive.moderation.entity.PhotoRemovalRequest;
import com.gecarchive.moderation.entity.RemovalRequestStatus;
import com.gecarchive.moderation.repository.PhotoRemovalRequestRepository;
import com.gecarchive.photo.entity.Photo;
import com.gecarchive.photo.entity.PhotoStatus;
import com.gecarchive.photo.repository.PhotoRepository;
import com.gecarchive.user.entity.User;
import com.gecarchive.user.repository.UserRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Removal requests raised by uploaders and resolved by moderators.
 *
 * <p>Approving a request drives the photograph through the shared REMOVE
 * moderation transition, so history, audit and submission derivation stay
 * identical to a direct administrative removal.</p>
 */
@Service
public class PhotoRemovalRequestService {

    private static final int MAX_PAGE_SIZE = 100;

    private final PhotoRepository photos;
    private final PhotoRemovalRequestRepository requests;
    private final PhotoModerationService moderation;
    private final UserRepository users;
    private final AuditService audit;

    public PhotoRemovalRequestService(PhotoRepository photos, PhotoRemovalRequestRepository requests,
            PhotoModerationService moderation, UserRepository users, AuditService audit) {
        this.photos = photos;
        this.requests = requests;
        this.moderation = moderation;
        this.users = users;
        this.audit = audit;
    }

    /**
     * Only the uploader is eligible. Anyone else receives a 404 so the
     * existence of private submissions cannot be probed.
     */
    @Transactional
    public RemovalRequestResponse requestRemoval(UUID photoId, RemovalRequestRequest body, AuthenticatedUser actor,
            ClientInfo client) {
        Photo photo = photos.findById(photoId)
                .orElseThrow(() -> new ResourceNotFoundException("Photograph not found."));
        if (!photo.getUploadedBy().getId().equals(actor.id())) {
            throw new ResourceNotFoundException("Photograph not found.");
        }
        if (photo.getStatus() == PhotoStatus.REMOVED || photo.isDeleted()) {
            throw new ConflictException("This photograph has already been removed.");
        }
        if (requests.findByPhoto_IdAndRequestedBy_IdAndStatus(photoId, actor.id(), RemovalRequestStatus.PENDING)
                .isPresent()) {
            throw new ConflictException("You already have an open removal request for this photograph.");
        }

        User requester = user(actor.id());
        PhotoRemovalRequest request = new PhotoRemovalRequest();
        request.setPhoto(photo);
        request.setRequestedBy(requester);
        request.setReason(body.reason().trim());
        request.setStatus(RemovalRequestStatus.PENDING);
        requests.save(request);

        audit.record(requester, "PHOTO_REMOVAL_REQUESTED", "PHOTO", photoId, null,
                Map.of("requestId", request.getId().toString()), client);
        return RemovalRequestResponse.from(request);
    }

    @Transactional(readOnly = true)
    public PageResponse<RemovalRequestResponse> list(RemovalRequestStatus status, int page, int size) {
        PageRequest pageable = PageRequest.of(Math.max(0, page), bounded(size),
                Sort.by(Sort.Direction.ASC, "createdAt"));
        Page<PhotoRemovalRequest> result = status == null
                ? requests.findAllByOrderByCreatedAtAsc(pageable)
                : requests.findByStatusOrderByCreatedAtAsc(status, pageable);
        return PageResponse.from(result, RemovalRequestResponse::from);
    }

    @Transactional
    public RemovalRequestResponse resolve(UUID id, RemovalRequestResolutionRequest body, AuthenticatedUser actor,
            ClientInfo client) {
        PhotoRemovalRequest request = requests.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Removal request not found."));
        if (request.getStatus() != RemovalRequestStatus.PENDING) {
            throw new ConflictException("This removal request has already been handled.");
        }
        RemovalRequestStatus target = body.status();
        if (target != RemovalRequestStatus.APPROVED && target != RemovalRequestStatus.REJECTED) {
            throw new BadRequestException("A removal request must be approved or rejected.");
        }
        String note = body.resolutionNote().trim();

        Photo photo = request.getPhoto();
        if (target == RemovalRequestStatus.APPROVED && photo.getStatus() != PhotoStatus.REMOVED) {
            moderation.applyAction(photo, ModerationAction.REMOVE, new ModerationActionRequest(note, null),
                    actor, client);
        }

        RemovalRequestStatus from = request.getStatus();
        request.setStatus(target);
        request.setResolutionNote(note);
        request.setHandledBy(user(actor.id()));
        request.setHandledAt(Instant.now());
        requests.save(request);

        audit.record(user(actor.id()),
                target == RemovalRequestStatus.APPROVED ? "PHOTO_REMOVAL_APPROVED" : "PHOTO_REMOVAL_REJECTED",
                "PHOTO_REMOVAL_REQUEST", request.getId(), Map.of("status", from.name()),
                Map.of("status", target.name(), "photoStatus", photo.getStatus().name()), client);
        return RemovalRequestResponse.from(request);
    }

    private User user(UUID id) {
        return users.findById(id).orElseThrow(() -> new ResourceNotFoundException("User not found."));
    }

    private int bounded(int size) {
        return Math.min(Math.max(1, size), MAX_PAGE_SIZE);
    }
}
