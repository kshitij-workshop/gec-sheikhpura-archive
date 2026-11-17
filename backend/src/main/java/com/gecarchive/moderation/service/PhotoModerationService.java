package com.gecarchive.moderation.service;

import java.time.Instant;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import com.gecarchive.album.entity.Album;
import com.gecarchive.album.repository.AlbumRepository;
import com.gecarchive.audit.service.AuditService;
import com.gecarchive.common.dto.PageResponse;
import com.gecarchive.common.error.BadRequestException;
import com.gecarchive.common.error.ConflictException;
import com.gecarchive.common.error.ResourceNotFoundException;
import com.gecarchive.common.security.AuthenticatedUser;
import com.gecarchive.common.security.ClientInfo;
import com.gecarchive.moderation.dto.ModerationActionRequest;
import com.gecarchive.moderation.dto.ModerationHistoryEntryResponse;
import com.gecarchive.moderation.dto.ModerationPhotoResponse;
import com.gecarchive.moderation.dto.UpdatePhotoRequest;
import com.gecarchive.moderation.entity.ModerationAction;
import com.gecarchive.moderation.entity.PhotoModeration;
import com.gecarchive.moderation.repository.PhotoModerationRepository;
import com.gecarchive.photo.entity.Photo;
import com.gecarchive.photo.entity.PhotoPhotographer;
import com.gecarchive.photo.entity.PhotoStatus;
import com.gecarchive.photo.entity.PhotoSubmission;
import com.gecarchive.photo.entity.SubmissionStatus;
import com.gecarchive.photo.repository.PhotoPhotographerRepository;
import com.gecarchive.photo.repository.PhotoRepository;
import com.gecarchive.photo.repository.PhotoSubmissionRepository;
import com.gecarchive.user.entity.User;
import com.gecarchive.user.repository.UserRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Photo-level moderation state machine.
 *
 * <p>Every transition writes an append-only {@code photo_moderations} row and an
 * audit row in the same transaction, then re-derives the owning submission's
 * aggregate status. The denormalized {@code photos.status} column is only ever
 * mutated here.</p>
 */
@Service
public class PhotoModerationService {

    private static final int MAX_PAGE_SIZE = 100;

    private static final Map<ModerationAction, Set<PhotoStatus>> ALLOWED_FROM = Map.of(
            ModerationAction.APPROVE, Set.of(PhotoStatus.PENDING, PhotoStatus.FLAGGED),
            ModerationAction.REJECT, Set.of(PhotoStatus.PENDING, PhotoStatus.FLAGGED),
            ModerationAction.FLAG, Set.of(PhotoStatus.PENDING, PhotoStatus.APPROVED),
            ModerationAction.HIDE, Set.of(PhotoStatus.APPROVED, PhotoStatus.FLAGGED, PhotoStatus.REJECTED),
            ModerationAction.REMOVE, Set.of(PhotoStatus.PENDING, PhotoStatus.APPROVED, PhotoStatus.REJECTED,
                    PhotoStatus.FLAGGED, PhotoStatus.HIDDEN),
            ModerationAction.RESTORE, Set.of(PhotoStatus.FLAGGED, PhotoStatus.HIDDEN, PhotoStatus.REJECTED,
                    PhotoStatus.REMOVED));

    private static final Map<ModerationAction, PhotoStatus> TARGET_STATUS = Map.of(
            ModerationAction.APPROVE, PhotoStatus.APPROVED,
            ModerationAction.REJECT, PhotoStatus.REJECTED,
            ModerationAction.FLAG, PhotoStatus.FLAGGED,
            ModerationAction.HIDE, PhotoStatus.HIDDEN,
            ModerationAction.REMOVE, PhotoStatus.REMOVED,
            ModerationAction.RESTORE, PhotoStatus.PENDING);

    private static final Set<ModerationAction> REASON_REQUIRED = Set.of(
            ModerationAction.REJECT, ModerationAction.FLAG, ModerationAction.HIDE,
            ModerationAction.REMOVE, ModerationAction.RESTORE);

    private static final Map<ModerationAction, String> AUDIT_ACTION = Map.of(
            ModerationAction.APPROVE, "PHOTO_APPROVED",
            ModerationAction.REJECT, "PHOTO_REJECTED",
            ModerationAction.FLAG, "PHOTO_FLAGGED",
            ModerationAction.HIDE, "PHOTO_HIDDEN",
            ModerationAction.REMOVE, "PHOTO_REMOVED",
            ModerationAction.RESTORE, "PHOTO_RESTORED");

    private final PhotoRepository photos;
    private final PhotoModerationRepository moderations;
    private final PhotoSubmissionRepository submissions;
    private final PhotoPhotographerRepository photographers;
    private final AlbumRepository albums;
    private final UserRepository users;
    private final AuditService audit;

    public PhotoModerationService(
            PhotoRepository photos,
            PhotoModerationRepository moderations,
            PhotoSubmissionRepository submissions,
            PhotoPhotographerRepository photographers,
            AlbumRepository albums,
            UserRepository users,
            AuditService audit) {
        this.photos = photos;
        this.moderations = moderations;
        this.submissions = submissions;
        this.photographers = photographers;
        this.albums = albums;
        this.users = users;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public PageResponse<ModerationPhotoResponse> queue(PhotoStatus status, int page, int size) {
        PageRequest pageable = PageRequest.of(Math.max(0, page), bounded(size),
                Sort.by(Sort.Direction.ASC, "createdAt"));
        Page<Photo> result = status == null
                ? photos.findAllByOrderByCreatedAtAsc(pageable)
                : photos.findByStatusOrderByCreatedAtAsc(status, pageable);
        Map<UUID, List<PhotoPhotographer>> credits = creditsFor(result.getContent());
        return new PageResponse<>(
                result.getContent().stream()
                        .map(photo -> ModerationPhotoResponse.from(photo,
                                credits.getOrDefault(photo.getId(), List.of())))
                        .toList(),
                result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages());
    }

    @Transactional(readOnly = true)
    public List<ModerationHistoryEntryResponse> history(UUID photoId) {
        photo(photoId);
        return moderations.findByPhoto_IdOrderByCreatedAtDesc(photoId).stream()
                .map(ModerationHistoryEntryResponse::from)
                .toList();
    }

    /**
     * Writes the opening SUBMIT row when a photograph is registered so every
     * moderation history starts with the uploader's original contribution.
     */
    @Transactional
    public void recordSubmission(Photo photo, User actor) {
        PhotoModeration entry = new PhotoModeration();
        entry.setPhoto(photo);
        entry.setActor(actor);
        entry.setActorRole(actor.getRole());
        entry.setActorDisplayName(actor.getDisplayName());
        entry.setAction(ModerationAction.SUBMIT);
        entry.setFromStatus(null);
        entry.setToStatus(PhotoStatus.PENDING);
        entry.setReason(null);
        moderations.save(entry);
    }

    @Transactional
    public ModerationPhotoResponse moderate(UUID photoId, ModerationAction action,
            ModerationActionRequest request, AuthenticatedUser actor, ClientInfo client) {
        Photo photo = photo(photoId);
        applyAction(photo, action, request, actor, client);
        return ModerationPhotoResponse.from(photo,
                photographers.findByPhoto_IdOrderByCreditOrderAsc(photo.getId()));
    }

    /**
     * Applies a validated transition to an already-loaded photograph.
     *
     * <p>Shared with removal-request approval so both entry points produce the
     * same moderation history, audit rows and submission re-derivation.</p>
     */
    @Transactional
    public void applyAction(Photo photo, ModerationAction action, ModerationActionRequest request,
            AuthenticatedUser actor, ClientInfo client) {
        PhotoStatus from = photo.getStatus();
        Set<PhotoStatus> allowed = ALLOWED_FROM.get(action);
        if (allowed == null || !allowed.contains(from)) {
            throw new ConflictException("A photograph in the " + from.name() + " state cannot be "
                    + verb(action) + ".");
        }
        if (photo.isDeleted()) {
            throw new ConflictException("This photograph has been archived and can no longer be moderated.");
        }

        String reason = normalizeReason(action, request == null ? null : request.reason());
        PhotoStatus to = TARGET_STATUS.get(action);
        User actorUser = user(actor.id());

        if (action == ModerationAction.APPROVE) {
            applyApproval(photo, request, actorUser);
        } else {
            photo.setStatus(to);
            if (to != PhotoStatus.APPROVED) {
                photo.setApprovedAt(null);
                photo.setApprovedBy(null);
            }
        }
        photos.save(photo);

        recordModeration(photo, action, from, to, reason, actorUser);
        audit.record(actorUser, AUDIT_ACTION.get(action), "PHOTO", photo.getId(),
                Map.of("status", from.name()), afterState(to, photo), client);
        rederiveSubmission(photo);
    }

    private void applyApproval(Photo photo, ModerationActionRequest request, User actorUser) {
        UUID requestedAlbumId = request == null ? null : request.albumId();
        Album album = requestedAlbumId == null
                ? photo.getAlbum()
                : albums.findById(requestedAlbumId)
                        .orElseThrow(() -> new ResourceNotFoundException("Album not found."));
        if (album == null) {
            throw new BadRequestException("An album must be assigned before this photograph can be approved.");
        }
        if (album.isDeleted()) {
            throw new BadRequestException("The selected album is archived.");
        }
        if (album.getEvent().isDeleted()) {
            throw new BadRequestException("The selected album's event is archived.");
        }
        UUID requestedEventId = request == null ? null : request.eventId();
        boolean movingToAnotherEvent = !album.getEvent().getId().equals(photo.getEvent().getId());
        if (movingToAnotherEvent && requestedEventId == null) {
            throw new BadRequestException("The selected album belongs to a different event.");
        }
        validateEventMatchesAlbum(requestedEventId, album);
        if (request != null
                && (request.title() != null || request.caption() != null || request.altText() != null)) {
            applyMetadata(photo, request.title(), request.caption(), request.altText());
        }
        photo.setAlbum(album);
        photo.setEvent(album.getEvent());
        photo.setStatus(PhotoStatus.APPROVED);
        photo.setApprovedAt(Instant.now());
        photo.setApprovedBy(actorUser);
    }

    /**
     * Lets an administrator re-file or retitle a photograph without changing
     * its moderation status. The album determines the photograph's event;
     * {@code eventId} is accepted only when it agrees with that album.
     */
    @Transactional
    public ModerationPhotoResponse updateDetails(UUID photoId, UpdatePhotoRequest request,
            AuthenticatedUser actor, ClientInfo client) {
        Photo photo = photo(photoId);
        if (photo.isDeleted()) {
            throw new ConflictException("This photograph has been archived and can no longer be edited.");
        }

        Album album = albums.findById(request.albumId())
                .orElseThrow(() -> new ResourceNotFoundException("Album not found."));
        if (album.isDeleted()) {
            throw new BadRequestException("The selected album is archived.");
        }
        if (album.getEvent().isDeleted()) {
            throw new BadRequestException("The selected album's event is archived.");
        }
        validateEventMatchesAlbum(request.eventId(), album);

        User actorUser = user(actor.id());
        UUID beforeEventId = photo.getEvent().getId();
        UUID beforeAlbumId = photo.getAlbum() == null ? null : photo.getAlbum().getId();
        String beforeTitle = photo.getTitle();

        photo.setAlbum(album);
        photo.setEvent(album.getEvent());
        applyMetadata(photo, request.title(), request.caption(), request.altText());
        photos.save(photo);

        Map<String, Object> before = new LinkedHashMap<>();
        before.put("eventId", beforeEventId);
        if (beforeAlbumId != null) {
            before.put("albumId", beforeAlbumId);
        }
        if (beforeTitle != null) {
            before.put("title", beforeTitle);
        }
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("eventId", photo.getEvent().getId());
        after.put("albumId", photo.getAlbum().getId());
        if (photo.getTitle() != null) {
            after.put("title", photo.getTitle());
        }
        audit.record(actorUser, "PHOTO_DETAILS_UPDATED", "PHOTO", photo.getId(), before, after, client);

        return ModerationPhotoResponse.from(photo,
                photographers.findByPhoto_IdOrderByCreditOrderAsc(photo.getId()));
    }

    private void validateEventMatchesAlbum(UUID requestedEventId, Album album) {
        if (requestedEventId != null && !requestedEventId.equals(album.getEvent().getId())) {
            throw new BadRequestException("The selected album belongs to a different event.");
        }
    }

    private void applyMetadata(Photo photo, String title, String caption, String altText) {
        photo.setTitle(trimToNull(title));
        photo.setCaption(trimToNull(caption));
        photo.setAltText(trimToNull(altText));
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void recordModeration(Photo photo, ModerationAction action, PhotoStatus from, PhotoStatus to,
            String reason, User actorUser) {
        PhotoModeration entry = new PhotoModeration();
        entry.setPhoto(photo);
        entry.setActor(actorUser);
        entry.setActorRole(actorUser.getRole());
        entry.setActorDisplayName(actorUser.getDisplayName());
        entry.setAction(action);
        entry.setFromStatus(from);
        entry.setToStatus(to);
        entry.setReason(reason);
        moderations.save(entry);
    }

    /**
     * Recomputes the batch status from per-photo state; the batch never overrides it.
     */
    private void rederiveSubmission(Photo photo) {
        PhotoSubmission submission = photo.getSubmission();
        if (submission == null || submission.getStatus() == SubmissionStatus.WITHDRAWN) {
            return;
        }
        long total = photos.countBySubmission_Id(submission.getId());
        if (total == 0) {
            return;
        }
        long pending = photos.countBySubmission_IdAndStatus(submission.getId(), PhotoStatus.PENDING);
        long flagged = photos.countBySubmission_IdAndStatus(submission.getId(), PhotoStatus.FLAGGED);

        SubmissionStatus next;
        if (pending == total) {
            next = SubmissionStatus.PENDING;
        } else if (pending == 0 && flagged == 0) {
            next = SubmissionStatus.COMPLETED;
        } else {
            next = SubmissionStatus.IN_REVIEW;
        }
        if (next != submission.getStatus()) {
            submission.setStatus(next);
            submissions.save(submission);
        }
    }

    private String normalizeReason(ModerationAction action, String reason) {
        String value = reason == null || reason.isBlank() ? null : reason.trim();
        if (REASON_REQUIRED.contains(action) && value == null) {
            throw new BadRequestException("A reason is required for this moderation action.");
        }
        return value;
    }

    private Photo photo(UUID id) {
        return photos.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Photograph not found."));
    }

    private User user(UUID id) {
        return users.findById(id).orElseThrow(() -> new ResourceNotFoundException("User not found."));
    }

    private Map<String, Object> afterState(PhotoStatus to, Photo photo) {
        Map<String, Object> state = new LinkedHashMap<>();
        state.put("status", to.name());
        if (photo.getAlbum() != null) {
            state.put("albumId", photo.getAlbum().getId().toString());
        }
        return state;
    }

    private Map<UUID, List<PhotoPhotographer>> creditsFor(Collection<Photo> page) {
        if (page.isEmpty()) {
            return Map.of();
        }
        List<UUID> ids = page.stream().map(Photo::getId).toList();
        return photographers.findByPhoto_IdInOrderByPhoto_IdAscCreditOrderAsc(ids).stream()
                .collect(Collectors.groupingBy(credit -> credit.getPhoto().getId()));
    }

    private String verb(ModerationAction action) {
        return switch (action) {
            case SUBMIT -> "submitted";
            case APPROVE -> "approved";
            case REJECT -> "rejected";
            case FLAG -> "flagged";
            case HIDE -> "hidden";
            case REMOVE -> "removed";
            case RESTORE -> "restored";
        };
    }

    private int bounded(int size) {
        return Math.min(Math.max(1, size), MAX_PAGE_SIZE);
    }
}
