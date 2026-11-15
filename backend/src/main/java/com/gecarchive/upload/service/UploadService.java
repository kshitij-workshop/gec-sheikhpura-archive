package com.gecarchive.upload.service;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.gecarchive.album.entity.Album;
import com.gecarchive.album.repository.AlbumRepository;
import com.gecarchive.audit.service.AuditService;
import com.gecarchive.common.dto.PageResponse;
import com.gecarchive.common.error.BadRequestException;
import com.gecarchive.common.error.ConflictException;
import com.gecarchive.common.error.ResourceNotFoundException;
import com.gecarchive.common.security.AuthenticatedUser;
import com.gecarchive.common.security.ClientInfo;
import com.gecarchive.common.text.Slugs;
import com.gecarchive.event.entity.Event;
import com.gecarchive.event.repository.EventRepository;
import com.gecarchive.photo.entity.Photo;
import com.gecarchive.photo.entity.PhotoPhotographer;
import com.gecarchive.photo.entity.PhotoStatus;
import com.gecarchive.photo.entity.PhotoSubmission;
import com.gecarchive.photo.entity.SubmissionStatus;
import com.gecarchive.photo.repository.PhotoPhotographerRepository;
import com.gecarchive.photo.repository.PhotoRepository;
import com.gecarchive.photo.repository.PhotoSubmissionRepository;
import com.gecarchive.contributor.entity.ContributorProfile;
import com.gecarchive.contributor.repository.ContributorProfileRepository;
import com.gecarchive.upload.config.CloudinaryProperties;
import com.gecarchive.upload.config.UploadProperties;
import com.gecarchive.upload.dto.AuthorizeUploadRequest;
import com.gecarchive.upload.dto.CreateSubmissionRequest;
import com.gecarchive.upload.dto.PhotographerCreditRequest;
import com.gecarchive.upload.dto.PhotoResponse;
import com.gecarchive.upload.dto.RegisterPhotoRequest;
import com.gecarchive.upload.dto.SubmissionResponse;
import com.gecarchive.upload.dto.UploadAuthorizationResponse;
import com.gecarchive.upload.entity.UploadAuthorization;
import com.gecarchive.upload.repository.UploadAuthorizationRepository;
import com.gecarchive.user.entity.User;
import com.gecarchive.user.repository.UserRepository;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UploadService {

    private static final List<String> ALLOWED_FORMATS = List.of("jpg", "jpeg", "png", "webp");

    private final EventRepository events;
    private final AlbumRepository albums;
    private final UserRepository users;
    private final PhotoSubmissionRepository submissions;
    private final PhotoRepository photos;
    private final PhotoPhotographerRepository photographers;
    private final ContributorProfileRepository contributorProfiles;
    private final UploadAuthorizationRepository authorizations;
    private final CloudinarySignatureService signatures;
    private final CloudinaryAssetVerifier cloudinary;
    private final UploadProperties uploadProperties;
    private final CloudinaryProperties cloudinaryProperties;
    private final com.gecarchive.auth.service.RateLimitService rateLimiter;
    private final AuditService audit;
    private final com.gecarchive.moderation.service.PhotoModerationService moderationHistory;

    public UploadService(EventRepository events, AlbumRepository albums, UserRepository users,
            PhotoSubmissionRepository submissions, PhotoRepository photos,
            PhotoPhotographerRepository photographers, ContributorProfileRepository contributorProfiles,
            UploadAuthorizationRepository authorizations, CloudinarySignatureService signatures,
            CloudinaryAssetVerifier cloudinary, UploadProperties uploadProperties,
            CloudinaryProperties cloudinaryProperties, com.gecarchive.auth.service.RateLimitService rateLimiter,
            AuditService audit, com.gecarchive.moderation.service.PhotoModerationService moderationHistory) {
        this.events = events;
        this.albums = albums;
        this.users = users;
        this.submissions = submissions;
        this.photos = photos;
        this.photographers = photographers;
        this.contributorProfiles = contributorProfiles;
        this.authorizations = authorizations;
        this.signatures = signatures;
        this.cloudinary = cloudinary;
        this.uploadProperties = uploadProperties;
        this.cloudinaryProperties = cloudinaryProperties;
        this.rateLimiter = rateLimiter;
        this.audit = audit;
        this.moderationHistory = moderationHistory;
    }

    @Transactional
    public SubmissionResponse createSubmission(CreateSubmissionRequest request, AuthenticatedUser actor,
            ClientInfo client) {
        Event event = events.findById(request.eventId())
                .orElseThrow(() -> new ResourceNotFoundException("Event not found."));
        if (event.isDeleted()) throw new BadRequestException("The selected event is archived.");

        Album album = null;
        if (request.albumId() != null) {
            album = albums.findById(request.albumId())
                    .orElseThrow(() -> new ResourceNotFoundException("Album not found."));
            if (!album.getEvent().getId().equals(event.getId()) || album.isDeleted()) {
                throw new BadRequestException("The selected album does not belong to the selected event.");
            }
        }

        PhotoSubmission submission = new PhotoSubmission();
        submission.setSubmittedBy(user(actor.id()));
        submission.setEvent(event);
        submission.setAlbum(album);
        submission.setStatus(SubmissionStatus.PENDING);
        submission.setNote(blankToNull(request.note()));
        submissions.save(submission);
        audit.record(user(actor.id()), "SUBMISSION_CREATED", "PHOTO_SUBMISSION", submission.getId(), null,
                Map.of("eventId", event.getId().toString()), client);
        return SubmissionResponse.from(submission);
    }

    @Transactional(readOnly = true)
    public PageResponse<SubmissionResponse> listSubmissions(AuthenticatedUser actor, int page, int size) {
        var result = submissions.findBySubmittedBy_IdOrderByCreatedAtDesc(actor.id(),
                PageRequest.of(Math.max(0, page), bounded(size)));
        return PageResponse.from(result, SubmissionResponse::from);
    }

    @Transactional
    public UploadAuthorizationResponse authorize(AuthorizeUploadRequest request, AuthenticatedUser actor,
            ClientInfo client) {
        rateLimiter.check("upload:user:" + actor.id(), uploadProperties.authorizePerUserPerHour(),
                uploadProperties.rateLimitWindow());
        rateLimiter.check("upload:ip:" + String.valueOf(client.ipAddress()), uploadProperties.authorizePerIpPerHour(),
                uploadProperties.rateLimitWindow());
        requireCloudinaryUploadConfiguration();

        PhotoSubmission submission = ownedSubmission(request.submissionId(), actor.id());
        if (submission.getStatus() == SubmissionStatus.WITHDRAWN || submission.getStatus() == SubmissionStatus.COMPLETED) {
            throw new ConflictException("This submission can no longer accept uploads.");
        }
        long registered = photos.countBySubmission_Id(submission.getId());
        long authorized = authorizations.countBySubmission_Id(submission.getId());
        if (Math.max(registered, authorized) >= uploadProperties.maxPhotosPerSubmission()) {
            throw new ConflictException("The submission has reached its photo limit.");
        }

        Instant now = Instant.now();
        long timestamp = now.getEpochSecond();
        String publicId = cloudinaryProperties.folder() + "/submissions/" + submission.getId() + "/" + UUID.randomUUID();
        Map<String, String> signed = new LinkedHashMap<>();
        signed.put("public_id", publicId);
        signed.put("timestamp", Long.toString(timestamp));
        signed.put("upload_preset", cloudinaryProperties.uploadPreset());

        UploadAuthorization authorization = new UploadAuthorization();
        authorization.setUser(user(actor.id()));
        authorization.setSubmission(submission);
        authorization.setPublicId(publicId);
        authorization.setUploadTimestamp(timestamp);
        authorization.setUploadSignature(signatures.sign(signed));
        authorization.setExpiresAt(now.plus(uploadProperties.authorizationTtl()));
        authorizations.save(authorization);

        audit.record(user(actor.id()), "UPLOAD_AUTHORIZED", "UPLOAD_AUTHORIZATION", authorization.getId(), null,
                Map.of("submissionId", submission.getId().toString()), client);

        return new UploadAuthorizationResponse(authorization.getId(), cloudinaryProperties.cloudName(),
                cloudinaryProperties.apiKey(), "https://api.cloudinary.com/v1_1/" + cloudinaryProperties.cloudName() + "/image/upload",
                cloudinaryProperties.uploadPreset(), cloudinaryProperties.folder(), publicId, timestamp,
                authorization.getUploadSignature(), authorization.getExpiresAt(), uploadProperties.maxFileSizeBytes(),
                ALLOWED_FORMATS);
    }

    @Transactional
    public PhotoResponse registerPhoto(UUID submissionId, RegisterPhotoRequest request, AuthenticatedUser actor,
            ClientInfo client) {
        PhotoSubmission submission = ownedSubmission(submissionId, actor.id());
        UploadAuthorization authorization = authorizations.findByIdAndUser_Id(request.authorizationId(), actor.id())
                .orElseThrow(() -> new ResourceNotFoundException("Upload authorization not found."));
        if (!authorization.getSubmission().getId().equals(submission.getId()) || !authorization.isUsable(Instant.now())) {
            throw new BadRequestException("The upload authorization is invalid or expired.");
        }
        if (!authorization.getPublicId().equals(request.publicId())) {
            throw new BadRequestException("The uploaded asset does not match the authorization.");
        }

        CloudinaryAsset asset;
        try {
            asset = cloudinary.verify(authorization.getPublicId());
        } catch (RuntimeException exception) {
            throw new BadRequestException("The uploaded asset could not be verified.");
        }
        validateAsset(asset, authorization);
        if (photos.existsByCloudinaryPublicId(asset.publicId()) || photos.existsByCloudinaryAssetId(asset.assetId())) {
            throw new ConflictException("The uploaded asset is already attached to a photo.");
        }
        if (photos.countBySubmission_Id(submission.getId()) >= uploadProperties.maxPhotosPerSubmission()) {
            throw new ConflictException("The submission has reached its photo limit.");
        }

        Photo photo = new Photo();
        photo.setSubmission(submission);
        photo.setEvent(submission.getEvent());
        photo.setAlbum(submission.getAlbum());
        photo.setUploadedBy(user(actor.id()));
        photo.setTitle(blankToNull(request.title()));
        photo.setCaption(blankToNull(request.caption()));
        photo.setAltText(blankToNull(request.altText()));
        photo.setTakenAt(request.takenAt());
        photo.setCloudinaryPublicId(asset.publicId());
        photo.setCloudinaryAssetId(asset.assetId());
        photo.setFormat(asset.format().toLowerCase(java.util.Locale.ROOT));
        photo.setWidthPx(asset.width());
        photo.setHeightPx(asset.height());
        photo.setSizeBytes(asset.bytes());
        photo.setStatus(PhotoStatus.PENDING);
        photos.save(photo);
        ensurePublicContributorProfile(photo.getUploadedBy());

        for (short order = 0; order < request.photographers().size(); order++) {
            PhotographerCreditRequest requestCredit = request.photographers().get(order);
            PhotoPhotographer credit = new PhotoPhotographer();
            credit.setPhoto(photo);
            credit.setCreditOrder(order);
            credit.setCreditName(requestCredit.creditName().trim());
            if (requestCredit.contributorProfileId() != null) {
                ContributorProfile profile = contributorProfiles.findById(requestCredit.contributorProfileId())
                        .orElseThrow(() -> new ResourceNotFoundException("Photographer profile not found."));
                if (profile.isDeleted()) throw new BadRequestException("The photographer profile is archived.");
                credit.setContributorProfile(profile);
            }
            photographers.save(credit);
        }
        moderationHistory.recordSubmission(photo, user(actor.id()));
        authorization.setUsedAt(Instant.now());
        authorizations.save(authorization);
        audit.record(user(actor.id()), "PHOTO_REGISTERED", "PHOTO", photo.getId(), null,
                Map.of("submissionId", submission.getId().toString(), "status", PhotoStatus.PENDING.name()), client);
        return PhotoResponse.from(photo, photographers.findByPhoto_IdOrderByCreditOrderAsc(photo.getId()));
    }

    private void validateAsset(CloudinaryAsset asset, UploadAuthorization authorization) {
        if (asset.assetId() == null || asset.assetId().isBlank() || !authorization.getPublicId().equals(asset.publicId())
                || !"image".equals(asset.resourceType()) || !"upload".equals(asset.deliveryType())) {
            throw new BadRequestException("The uploaded asset has an unexpected identity or delivery type.");
        }
        String format = asset.format() == null ? "" : asset.format().toLowerCase(java.util.Locale.ROOT);
        if (!ALLOWED_FORMATS.contains(format) || asset.bytes() <= 0 || asset.bytes() > uploadProperties.maxFileSizeBytes()
                || asset.width() <= 0 || asset.height() <= 0) {
            throw new BadRequestException("The uploaded asset does not meet the archive requirements.");
        }
        Instant now = Instant.now();
        if (asset.createdAt() == null || asset.createdAt().isBefore(authorization.getCreatedAt().minusSeconds(300))
                || asset.createdAt().isAfter(now.plusSeconds(60))) {
            throw new BadRequestException("The uploaded asset was created outside the authorization window.");
        }
    }

    private PhotoSubmission ownedSubmission(UUID id, UUID userId) {
        PhotoSubmission submission = submissions.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found."));
        if (!submission.getSubmittedBy().getId().equals(userId)) {
            throw new ResourceNotFoundException("Submission not found.");
        }
        return submission;
    }

    private User user(UUID id) { return users.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User not found.")); }

    /**
     * A successful contribution makes the account eligible for the public
     * contributor directory. This profile is deliberately not attached to any
     * photographer credit: uploader and photographer remain separate concepts.
     */
    private void ensurePublicContributorProfile(User contributor) {
        if (contributorProfiles.findByUser_Id(contributor.getId()).isPresent()) {
            return;
        }

        String base = Slugs.normalize(contributor.getDisplayName());
        if (base == null || base.isBlank()) {
            base = "contributor";
        }
        String slug = base;
        if (contributorProfiles.existsBySlug(slug)) {
            slug = base + "-" + contributor.getId().toString().substring(0, 8);
        }

        ContributorProfile profile = new ContributorProfile();
        profile.setUser(contributor);
        profile.setCreatedBy(contributor);
        profile.setDisplayName(contributor.getDisplayName());
        profile.setSlug(slug);
        profile.setPublished(true);
        contributorProfiles.save(profile);

        audit.record(contributor, "CONTRIBUTOR_PROFILE_CREATED", "CONTRIBUTOR_PROFILE", profile.getId(),
                null, Map.of("displayName", profile.getDisplayName(), "slug", profile.getSlug()),
                null);
    }

    private void requireCloudinaryUploadConfiguration() {
        if (cloudinaryProperties.cloudName() == null || cloudinaryProperties.cloudName().isBlank()
                || cloudinaryProperties.apiKey() == null || cloudinaryProperties.apiKey().isBlank()
                || cloudinaryProperties.apiSecret() == null || cloudinaryProperties.apiSecret().isBlank()
                || cloudinaryProperties.uploadPreset() == null || cloudinaryProperties.uploadPreset().isBlank()) {
            throw new IllegalStateException("Cloudinary upload configuration is incomplete");
        }
    }

    private int bounded(int size) { return Math.min(Math.max(1, size), 100); }
    private String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
