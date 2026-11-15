package com.gecarchive.moderation;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import com.gecarchive.album.entity.Album;
import com.gecarchive.album.repository.AlbumRepository;
import com.gecarchive.event.entity.AcademicYear;
import com.gecarchive.event.entity.Category;
import com.gecarchive.event.entity.Event;
import com.gecarchive.event.repository.AcademicYearRepository;
import com.gecarchive.event.repository.CategoryRepository;
import com.gecarchive.event.repository.EventRepository;
import com.gecarchive.moderation.entity.PhotoModeration;
import com.gecarchive.moderation.entity.RemovalRequestStatus;
import com.gecarchive.moderation.entity.ReportStatus;
import com.gecarchive.moderation.repository.PhotoModerationRepository;
import com.gecarchive.moderation.repository.PhotoRemovalRequestRepository;
import com.gecarchive.moderation.repository.PhotoReportRepository;
import com.gecarchive.photo.entity.PhotoStatus;
import com.gecarchive.photo.entity.SubmissionStatus;
import com.gecarchive.photo.repository.PhotoRepository;
import com.gecarchive.photo.repository.PhotoSubmissionRepository;
import com.gecarchive.support.AbstractAuthIntegrationTest;
import com.gecarchive.upload.service.CapturingCloudinaryAssetVerifier;
import com.gecarchive.upload.service.CloudinaryAsset;
import com.gecarchive.user.entity.Role;
import com.gecarchive.user.entity.User;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ModerationIntegrationIT extends AbstractAuthIntegrationTest {

    private static final String JSON = MediaType.APPLICATION_JSON_VALUE;

    @Autowired
    private AcademicYearRepository academicYears;

    @Autowired
    private CategoryRepository categories;

    @Autowired
    private EventRepository events;

    @Autowired
    private AlbumRepository albums;

    @Autowired
    private PhotoRepository photos;

    @Autowired
    private PhotoSubmissionRepository submissions;

    @Autowired
    private PhotoModerationRepository moderations;

    @Autowired
    private PhotoReportRepository reports;

    @Autowired
    private PhotoRemovalRequestRepository removalRequests;

    @Autowired
    private CapturingCloudinaryAssetVerifier cloudinary;

    @Autowired
    private com.gecarchive.event.repository.EventSuggestionRepository suggestions;

    @BeforeEach
    void clearAssets() {
        cloudinary.clear();
    }

    // ---------------------------------------------------------------- approval

    @Test
    void adminApprovesAPendingPhotoIntoAnAlbumAndPublishesIt() throws Exception {
        User admin = account(Role.ADMIN);
        User uploader = account(Role.USER);
        Event event = event(admin);
        Album album = album(event, admin);
        String adminAuth = auth(admin);
        String uploadAuth = auth(uploader);

        Submitted submitted = submitPhoto(uploadAuth, event.getId(), null);
        assertThat(photos.findById(UUID.fromString(submitted.photoId())).orElseThrow().getAlbum()).isNull();

        mockMvc.perform(post("/api/v1/admin/photos/" + submitted.photoId() + "/approve")
                        .header(HttpHeaders.AUTHORIZATION, adminAuth)
                        .contentType(JSON)
                        .content("{\"albumId\":\"" + album.getId() + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.albumId").value(album.getId().toString()));

        var photo = photos.findById(UUID.fromString(submitted.photoId())).orElseThrow();
        assertThat(photo.getStatus()).isEqualTo(PhotoStatus.APPROVED);
        assertThat(photo.getAlbum().getId()).isEqualTo(album.getId());
        assertThat(photo.getApprovedAt()).isNotNull();
        assertThat(photo.getApprovedBy().getId()).isEqualTo(admin.getId());

        var history = moderations.findByPhoto_IdOrderByCreatedAtDesc(photo.getId());
        assertThat(history).hasSize(2);
        assertThat(history.get(0).getAction().name()).isEqualTo("APPROVE");
        assertThat(history.get(0).getFromStatus()).isEqualTo(PhotoStatus.PENDING);
        assertThat(history.get(0).getToStatus()).isEqualTo(PhotoStatus.APPROVED);
        assertThat(history.get(0).getActorRole()).isEqualTo(Role.ADMIN);
        assertThat(history.get(1).getAction().name()).isEqualTo("SUBMIT");

        mockMvc.perform(get("/api/v1/admin/photos/" + photo.getId() + "/moderation-history")
                        .header(HttpHeaders.AUTHORIZATION, adminAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].action").value("APPROVE"))
                .andExpect(jsonPath("$[1].action").value("SUBMIT"));

        mockMvc.perform(get("/api/v1/admin/audit-logs?entityType=PHOTO")
                        .header(HttpHeaders.AUTHORIZATION, adminAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[?(@.action == 'PHOTO_APPROVED')]").isNotEmpty());

        mockMvc.perform(get("/api/v1/photos/" + photo.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(photo.getId().toString()));
    }

    @Test
    void approvalRequiresAnAlbumFromTheSameEvent() throws Exception {
        User admin = account(Role.ADMIN);
        User uploader = account(Role.USER);
        Event event = event(admin);
        Album foreignAlbum = album(event(admin), admin);
        String adminAuth = auth(admin);
        String uploadAuth = auth(uploader);

        Submitted withoutAlbum = submitPhoto(uploadAuth, event.getId(), null);
        mockMvc.perform(post("/api/v1/admin/photos/" + withoutAlbum.photoId() + "/approve")
                        .header(HttpHeaders.AUTHORIZATION, adminAuth)
                        .contentType(JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
        assertThat(photos.findById(UUID.fromString(withoutAlbum.photoId())).orElseThrow().getStatus())
                .isEqualTo(PhotoStatus.PENDING);

        Submitted otherEventPhoto = submitPhoto(uploadAuth, event.getId(), null);
        mockMvc.perform(post("/api/v1/admin/photos/" + otherEventPhoto.photoId() + "/approve")
                        .header(HttpHeaders.AUTHORIZATION, adminAuth)
                        .contentType(JSON)
                        .content("{\"albumId\":\"" + foreignAlbum.getId() + "\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void moderationQueueCarriesContextAndAnAdminOnlyPreviewIdentifier() throws Exception {
        User admin = account(Role.ADMIN);
        User uploader = account(Role.USER);
        Event event = event(admin);
        Album album = album(event, admin);
        String adminAuth = auth(admin);
        Submitted submitted = submitPhoto(auth(uploader), event.getId(), album.getId());

        String queueBody = mockMvc.perform(get("/api/v1/admin/moderation/photos?status=PENDING")
                        .header(HttpHeaders.AUTHORIZATION, adminAuth))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String byId = "$.items[?(@.id == '" + submitted.photoId() + "')]";
        List<String> eventTitles = JsonPath.read(queueBody, byId + ".eventTitle");
        List<String> albumTitles = JsonPath.read(queueBody, byId + ".albumTitle");
        List<String> publicIds = JsonPath.read(queueBody, byId + ".cloudinaryPublicId");
        List<String> formats = JsonPath.read(queueBody, byId + ".format");
        List<String> uploaders = JsonPath.read(queueBody, byId + ".uploaderDisplayName");

        assertThat(eventTitles).containsExactly(event.getTitle());
        assertThat(albumTitles).containsExactly(album.getTitle());
        assertThat(formats).containsExactly("jpg");
        assertThat(uploaders).containsExactly(uploader.getDisplayName());
        assertThat(publicIds).hasSize(1);
        assertThat(publicIds.getFirst()).contains("/submissions/");

        String approvedQueue = mockMvc.perform(get("/api/v1/admin/moderation/photos?status=APPROVED")
                        .header(HttpHeaders.AUTHORIZATION, adminAuth))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat((List<?>) JsonPath.read(approvedQueue, byId + ".id")).isEmpty();

        // The preview identifier is admin-only and never reaches another read model.
        String ownPhotos = mockMvc.perform(get("/api/v1/me/photos")
                        .header(HttpHeaders.AUTHORIZATION, auth(uploader)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(ownPhotos).doesNotContain("cloudinaryPublicId");
    }

    @Test
    void onlyAdministratorsCanModerate() throws Exception {
        User admin = account(Role.ADMIN);
        User user = account(Role.USER);
        Event event = event(admin);
        Submitted submitted = submitPhoto(auth(user), event.getId(), null);

        mockMvc.perform(post("/api/v1/admin/photos/" + submitted.photoId() + "/approve")
                        .header(HttpHeaders.AUTHORIZATION, auth(user))
                        .contentType(JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/admin/moderation/photos")
                        .header(HttpHeaders.AUTHORIZATION, auth(user)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/admin/analytics")
                        .header(HttpHeaders.AUTHORIZATION, auth(user)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/admin/audit-logs"))
                .andExpect(status().isUnauthorized());

        // An unauthenticated POST trips CsrfFilter before AnonymousAuthenticationFilter
        // is reached, so it is denied by the access-denied handler (403) rather than the
        // authentication entry point (401). The request is rejected either way.
        mockMvc.perform(post("/api/v1/admin/photos/" + submitted.photoId() + "/reject")
                        .contentType(JSON)
                        .content("{\"reason\":\"nope\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/admin/moderation/photos"))
                .andExpect(status().isUnauthorized());

        assertThat(photos.findById(UUID.fromString(submitted.photoId())).orElseThrow().getStatus())
                .isEqualTo(PhotoStatus.PENDING);
        assertThat(moderations.findByPhoto_IdOrderByCreatedAtDesc(UUID.fromString(submitted.photoId())))
                .extracting(PhotoModeration::getAction)
                .doesNotContain(com.gecarchive.moderation.entity.ModerationAction.APPROVE,
                        com.gecarchive.moderation.entity.ModerationAction.REJECT);
    }

    @Test
    void rejectingRequiresAReasonAndAnInvalidTransitionConflicts() throws Exception {
        User admin = account(Role.ADMIN);
        User uploader = account(Role.USER);
        Event event = event(admin);
        Album album = album(event, admin);
        String adminAuth = auth(admin);
        String uploadAuth = auth(uploader);

        Submitted submitted = submitPhoto(uploadAuth, event.getId(), album.getId());

        mockMvc.perform(post("/api/v1/admin/photos/" + submitted.photoId() + "/reject")
                        .header(HttpHeaders.AUTHORIZATION, adminAuth)
                        .contentType(JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/v1/admin/photos/" + submitted.photoId() + "/approve")
                        .header(HttpHeaders.AUTHORIZATION, adminAuth)
                        .contentType(JSON)
                        .content("{}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/admin/photos/" + submitted.photoId() + "/approve")
                        .header(HttpHeaders.AUTHORIZATION, adminAuth)
                        .contentType(JSON)
                        .content("{}"))
                .andExpect(status().isConflict());

        mockMvc.perform(post("/api/v1/admin/photos/" + submitted.photoId() + "/restore")
                        .header(HttpHeaders.AUTHORIZATION, adminAuth)
                        .contentType(JSON)
                        .content("{\"reason\":\"reopened\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void rejectedHiddenAndRemovedPhotosNeverAppearPublicly() throws Exception {
        User admin = account(Role.ADMIN);
        User uploader = account(Role.USER);
        Event event = event(admin);
        Album album = album(event, admin);
        String adminAuth = auth(admin);
        String uploadAuth = auth(uploader);

        Submitted rejected = submitPhoto(uploadAuth, event.getId(), album.getId());
        Submitted hidden = submitPhoto(uploadAuth, event.getId(), album.getId());
        Submitted removed = submitPhoto(uploadAuth, event.getId(), album.getId());

        mockMvc.perform(post("/api/v1/admin/photos/" + rejected.photoId() + "/reject")
                        .header(HttpHeaders.AUTHORIZATION, adminAuth)
                        .contentType(JSON)
                        .content("{\"reason\":\"not suitable\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/admin/photos/" + hidden.photoId() + "/approve")
                        .header(HttpHeaders.AUTHORIZATION, adminAuth)
                        .contentType(JSON)
                        .content("{}"))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/admin/photos/" + hidden.photoId() + "/hide")
                        .header(HttpHeaders.AUTHORIZATION, adminAuth)
                        .contentType(JSON)
                        .content("{\"reason\":\"privacy concern\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/admin/photos/" + removed.photoId() + "/approve")
                        .header(HttpHeaders.AUTHORIZATION, adminAuth)
                        .contentType(JSON)
                        .content("{}"))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/admin/photos/" + removed.photoId() + "/remove")
                        .header(HttpHeaders.AUTHORIZATION, adminAuth)
                        .contentType(JSON)
                        .content("{\"reason\":\"takedown\"}"))
                .andExpect(status().isOk());

        for (Submitted submitted : new Submitted[] {rejected, hidden, removed}) {
            mockMvc.perform(get("/api/v1/photos/" + submitted.photoId()))
                    .andExpect(status().isNotFound());
        }

        mockMvc.perform(get("/api/v1/albums/" + album.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.photos.totalElements").value(0));

        for (Submitted submitted : new Submitted[] {rejected, hidden, removed}) {
            assertThat(photos.findById(UUID.fromString(submitted.photoId())).orElseThrow().getStatus())
                    .isNotEqualTo(PhotoStatus.APPROVED);
        }
    }

    @Test
    void submissionStatusIsDerivedFromPerPhotoState() throws Exception {
        User admin = account(Role.ADMIN);
        User uploader = account(Role.USER);
        Event event = event(admin);
        Album album = album(event, admin);
        String adminAuth = auth(admin);
        String uploadAuth = auth(uploader);

        String submissionId = createSubmission(uploadAuth, event.getId(), album.getId());
        String first = addPhoto(uploadAuth, submissionId);
        String second = addPhoto(uploadAuth, submissionId);

        assertThat(submissions.findById(UUID.fromString(submissionId)).orElseThrow().getStatus())
                .isEqualTo(SubmissionStatus.PENDING);

        mockMvc.perform(post("/api/v1/admin/photos/" + first + "/approve")
                        .header(HttpHeaders.AUTHORIZATION, adminAuth)
                        .contentType(JSON)
                        .content("{}"))
                .andExpect(status().isOk());
        assertThat(submissions.findById(UUID.fromString(submissionId)).orElseThrow().getStatus())
                .isEqualTo(SubmissionStatus.IN_REVIEW);

        mockMvc.perform(post("/api/v1/admin/photos/" + second + "/reject")
                        .header(HttpHeaders.AUTHORIZATION, adminAuth)
                        .contentType(JSON)
                        .content("{\"reason\":\"duplicate\"}"))
                .andExpect(status().isOk());
        assertThat(submissions.findById(UUID.fromString(submissionId)).orElseThrow().getStatus())
                .isEqualTo(SubmissionStatus.COMPLETED);
    }

    // ----------------------------------------------------------------- reports

    @Test
    void reportsTargetOnlyPublicPhotosAndCannotBeDuplicated() throws Exception {
        User admin = account(Role.ADMIN);
        User reporter = account(Role.USER);
        Event event = event(admin);
        Album album = album(event, admin);
        String reporterAuth = auth(reporter);

        Submitted pending = submitPhoto(reporterAuth, event.getId(), null);
        mockMvc.perform(post("/api/v1/photos/" + pending.photoId() + "/reports")
                        .header(HttpHeaders.AUTHORIZATION, reporterAuth)
                        .contentType(JSON)
                        .content("{\"category\":\"PRIVACY\",\"details\":\"consent unclear\"}"))
                .andExpect(status().isNotFound());

        Submitted published = submitPhoto(reporterAuth, event.getId(), album.getId());
        mockMvc.perform(post("/api/v1/admin/photos/" + published.photoId() + "/approve")
                        .header(HttpHeaders.AUTHORIZATION, auth(admin))
                        .contentType(JSON)
                        .content("{}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/photos/" + published.photoId() + "/reports")
                        .header(HttpHeaders.AUTHORIZATION, reporterAuth)
                        .contentType(JSON)
                        .content("{\"category\":\"PRIVACY\",\"details\":\"consent unclear\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"));

        mockMvc.perform(post("/api/v1/photos/" + published.photoId() + "/reports")
                        .header(HttpHeaders.AUTHORIZATION, reporterAuth)
                        .contentType(JSON)
                        .content("{\"category\":\"OTHER\"}"))
                .andExpect(status().isConflict());

        // See onlyAdministratorsCanModerate: an unauthenticated POST is rejected by the
        // CSRF filter (403) before the anonymous principal exists to yield a 401.
        mockMvc.perform(post("/api/v1/photos/" + published.photoId() + "/reports")
                        .contentType(JSON)
                        .content("{\"category\":\"OTHER\"}"))
                .andExpect(status().isForbidden());

        UUID reportId = reports.findAll().stream()
                .filter(report -> report.getPhoto().getId().toString().equals(published.photoId()))
                .findFirst().orElseThrow().getId();

        mockMvc.perform(patch("/api/v1/admin/reports/" + reportId)
                        .header(HttpHeaders.AUTHORIZATION, auth(admin))
                        .contentType(JSON)
                        .content("{\"status\":\"RESOLVED\"}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(patch("/api/v1/admin/reports/" + reportId)
                        .header(HttpHeaders.AUTHORIZATION, auth(admin))
                        .contentType(JSON)
                        .content("{\"status\":\"RESOLVED\",\"resolutionNote\":\"removed after review\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"));

        assertThat(reports.findById(reportId).orElseThrow().getStatus()).isEqualTo(ReportStatus.RESOLVED);

        mockMvc.perform(patch("/api/v1/admin/reports/" + reportId)
                        .header(HttpHeaders.AUTHORIZATION, auth(admin))
                        .contentType(JSON)
                        .content("{\"status\":\"DISMISSED\",\"resolutionNote\":\"again\"}"))
                .andExpect(status().isConflict());
    }

    // ---------------------------------------------------------- removal requests

    @Test
    void onlyTheUploaderMayRequestRemovalAndApprovalRemovesThePhoto() throws Exception {
        User admin = account(Role.ADMIN);
        User uploader = account(Role.USER);
        User stranger = account(Role.USER);
        Event event = event(admin);
        Album album = album(event, admin);
        String adminAuth = auth(admin);

        Submitted submitted = submitPhoto(auth(uploader), event.getId(), album.getId());
        mockMvc.perform(post("/api/v1/admin/photos/" + submitted.photoId() + "/approve")
                        .header(HttpHeaders.AUTHORIZATION, adminAuth)
                        .contentType(JSON)
                        .content("{}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/me/photos/" + submitted.photoId() + "/removal-request")
                        .header(HttpHeaders.AUTHORIZATION, auth(stranger))
                        .contentType(JSON)
                        .content("{\"reason\":\"not mine\"}"))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/v1/me/photos/" + submitted.photoId() + "/removal-request")
                        .header(HttpHeaders.AUTHORIZATION, auth(uploader))
                        .contentType(JSON)
                        .content("{\"reason\":\"subject asked for takedown\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"));

        mockMvc.perform(post("/api/v1/me/photos/" + submitted.photoId() + "/removal-request")
                        .header(HttpHeaders.AUTHORIZATION, auth(uploader))
                        .contentType(JSON)
                        .content("{\"reason\":\"duplicate\"}"))
                .andExpect(status().isConflict());

        UUID requestId = removalRequests.findAll().stream()
                .filter(request -> request.getPhoto().getId().toString().equals(submitted.photoId()))
                .findFirst().orElseThrow().getId();

        mockMvc.perform(patch("/api/v1/admin/removal-requests/" + requestId)
                        .header(HttpHeaders.AUTHORIZATION, adminAuth)
                        .contentType(JSON)
                        .content("{\"status\":\"APPROVED\",\"resolutionNote\":\"honoured\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        assertThat(removalRequests.findById(requestId).orElseThrow().getStatus())
                .isEqualTo(RemovalRequestStatus.APPROVED);
        assertThat(photos.findById(UUID.fromString(submitted.photoId())).orElseThrow().getStatus())
                .isEqualTo(PhotoStatus.REMOVED);

        mockMvc.perform(get("/api/v1/photos/" + submitted.photoId()))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/v1/admin/removal-requests?status=APPROVED")
                        .header(HttpHeaders.AUTHORIZATION, adminAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[?(@.id == '" + requestId + "')]").isNotEmpty());
    }

    // --------------------------------------------------------------- suggestions

    @Test
    void eventSuggestionsAreReviewedAndMayMaterialiseAnUnpublishedEvent() throws Exception {
        User admin = account(Role.ADMIN);
        User suggester = account(Role.USER);
        AcademicYear year = academicYear();
        Category category = category();
        String suggesterAuth = auth(suggester);

        mockMvc.perform(post("/api/v1/me/event-suggestions")
                        .header(HttpHeaders.AUTHORIZATION, suggesterAuth)
                        .contentType(JSON)
                        .content("""
                                {"title":"Annual Tech Fest","approximateDate":"%s",
                                 "categoryId":"%s","academicYearId":"%s"}
                                """.formatted(LocalDate.of(2035, 9, 15), category.getId(), year.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"));

        mockMvc.perform(get("/api/v1/me/event-suggestions")
                        .header(HttpHeaders.AUTHORIZATION, suggesterAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));

        mockMvc.perform(get("/api/v1/admin/event-suggestions")
                        .header(HttpHeaders.AUTHORIZATION, suggesterAuth))
                .andExpect(status().isForbidden());

        UUID suggestionId = suggestionId(suggester);

        mockMvc.perform(patch("/api/v1/admin/event-suggestions/" + suggestionId)
                        .header(HttpHeaders.AUTHORIZATION, auth(admin))
                        .contentType(JSON)
                        .content("{\"status\":\"REJECTED\",\"createEvent\":true}"))
                .andExpect(status().isBadRequest());

        MvcResult reviewed = mockMvc.perform(patch("/api/v1/admin/event-suggestions/" + suggestionId)
                        .header(HttpHeaders.AUTHORIZATION, auth(admin))
                        .contentType(JSON)
                        .content("{\"status\":\"APPROVED\",\"reviewNote\":\"worth adding\",\"createEvent\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andReturn();

        String createdEventId = JsonPath.read(reviewed.getResponse().getContentAsString(), "$.createdEventId");
        assertThat(createdEventId).isNotBlank();

        var created = events.findById(UUID.fromString(createdEventId)).orElseThrow();
        assertThat(created.isPublished()).isFalse();

        mockMvc.perform(get("/api/v1/events/" + createdEventId)).andExpect(status().isNotFound());

        mockMvc.perform(patch("/api/v1/admin/event-suggestions/" + suggestionId)
                        .header(HttpHeaders.AUTHORIZATION, auth(admin))
                        .contentType(JSON)
                        .content("{\"status\":\"APPROVED\"}"))
                .andExpect(status().isConflict());
    }

    // -------------------------------------------------------- audit and analytics

    @Test
    void auditLogsAndAnalyticsAreAdministrativeReads() throws Exception {
        User admin = account(Role.ADMIN);
        User user = account(Role.USER);
        Event event = event(admin);
        submitPhoto(auth(user), event.getId(), null);

        mockMvc.perform(get("/api/v1/admin/audit-logs"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/admin/audit-logs")
                        .header(HttpHeaders.AUTHORIZATION, auth(user)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/admin/analytics")
                        .header(HttpHeaders.AUTHORIZATION, auth(user)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/admin/audit-logs?entityType=PHOTO")
                        .header(HttpHeaders.AUTHORIZATION, auth(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[?(@.action == 'PHOTO_REGISTERED')]").isNotEmpty());

        mockMvc.perform(get("/api/v1/admin/audit-logs?entityType=PHOTO&entityId=" + UUID.randomUUID())
                        .header(HttpHeaders.AUTHORIZATION, auth(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isEmpty());

        mockMvc.perform(get("/api/v1/admin/analytics")
                        .header(HttpHeaders.AUTHORIZATION, auth(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.photosByStatus.PENDING").isNumber())
                .andExpect(jsonPath("$.photosByStatus.APPROVED").isNumber())
                .andExpect(jsonPath("$.usersByRole.USER").isNumber())
                .andExpect(jsonPath("$.events").isNumber());
    }

    // ------------------------------------------------------------ own submissions

    @Test
    void usersSeeOnlyTheirOwnPhotographsAndSubmissions() throws Exception {
        User admin = account(Role.ADMIN);
        User first = account(Role.USER);
        User second = account(Role.USER);
        Event event = event(admin);
        Album album = album(event, admin);

        Submitted firstPhoto = submitPhoto(auth(first), event.getId(), album.getId());
        Submitted secondPhoto = submitPhoto(auth(second), event.getId(), album.getId());

        mockMvc.perform(get("/api/v1/me/photos")
                        .header(HttpHeaders.AUTHORIZATION, auth(first)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[?(@.id == '" + secondPhoto.photoId() + "')]").isEmpty())
                .andExpect(jsonPath("$.items[?(@.id == '" + firstPhoto.photoId() + "')]").isNotEmpty());

        mockMvc.perform(get("/api/v1/me/photos")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/me/submissions"))
                .andExpect(status().isUnauthorized());
    }

    // ------------------------------------------------------------------ helpers

    private User account(Role role) {
        return createActiveUser(uniqueEmail(role.name().toLowerCase(Locale.ROOT)), defaultPassword(), role);
    }

    private String auth(User user) throws Exception {
        return "Bearer " + accessToken(login(user.getEmail(), defaultPassword()));
    }

    private UUID suggestionId(User suggester) {
        return suggestions.findBySuggestedBy_IdOrderByCreatedAtDesc(suggester.getId(),
                        org.springframework.data.domain.PageRequest.of(0, 1))
                .getContent().getFirst().getId();
    }

    private record Submitted(String photoId, String submissionId) {
    }

    private String createSubmission(String auth, UUID eventId, UUID albumId) throws Exception {
        String albumJson = albumId == null ? "null" : "\"" + albumId + "\"";
        MvcResult result = mockMvc.perform(post("/api/v1/me/submissions")
                        .header(HttpHeaders.AUTHORIZATION, auth)
                        .contentType(JSON)
                        .content("{\"eventId\":\"%s\",\"albumId\":%s}".formatted(eventId, albumJson)))
                .andExpect(status().isCreated())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.id");
    }

    private String addPhoto(String auth, String submissionId) throws Exception {
        MvcResult authorization = mockMvc.perform(post("/api/v1/me/uploads/authorize")
                        .header(HttpHeaders.AUTHORIZATION, auth)
                        .contentType(JSON)
                        .content("{\"submissionId\":\"%s\"}".formatted(submissionId)))
                .andExpect(status().isOk())
                .andReturn();
        String authorizationId = JsonPath.read(authorization.getResponse().getContentAsString(), "$.authorizationId");
        String publicId = JsonPath.read(authorization.getResponse().getContentAsString(), "$.publicId");

        cloudinary.put(new CloudinaryAsset("asset-" + UUID.randomUUID(), publicId, "image", "upload",
                "jpg", 1600, 1067, 2_000_000, Instant.now()));

        MvcResult registered = mockMvc.perform(post("/api/v1/me/submissions/" + submissionId + "/photos")
                        .header(HttpHeaders.AUTHORIZATION, auth)
                        .contentType(JSON)
                        .content("""
                                {"authorizationId":"%s","publicId":"%s","title":"Campus",
                                 "altText":"Campus view","photographers":[{"creditName":"Contributor"}]}
                                """.formatted(authorizationId, publicId)))
                .andExpect(status().isCreated())
                .andReturn();
        return JsonPath.read(registered.getResponse().getContentAsString(), "$.id");
    }

    private Submitted submitPhoto(String auth, UUID eventId, UUID albumId) throws Exception {
        String submissionId = createSubmission(auth, eventId, albumId);
        return new Submitted(addPhoto(auth, submissionId), submissionId);
    }

    private AcademicYear academicYear() {
        AcademicYear year = new AcademicYear();
        year.setLabel("2035-2036-" + UUID.randomUUID().toString().substring(0, 8));
        year.setStartDate(LocalDate.of(2035, 7, 1));
        year.setEndDate(LocalDate.of(2036, 6, 30));
        return academicYears.save(year);
    }

    private Category category() {
        Category category = new Category();
        category.setName("Moderation Category " + UUID.randomUUID());
        category.setSlug("moderation-category-" + UUID.randomUUID().toString().substring(0, 8));
        return categories.save(category);
    }

    private Event event(User creator) {
        AcademicYear year = academicYear();
        Category category = category();
        Event event = new Event();
        event.setAcademicYear(year);
        event.setCategory(category);
        event.setCreatedBy(creator);
        event.setTitle("Moderation Event " + UUID.randomUUID());
        event.setSlug("moderation-event-" + UUID.randomUUID().toString().substring(0, 8));
        event.setEventDate(LocalDate.of(2035, 8, 1));
        event.setPublished(true);
        return events.saveAndFlush(event);
    }

    private Album album(Event event, User creator) {
        Album album = new Album();
        album.setEvent(event);
        album.setCreatedBy(creator);
        album.setTitle("Moderation Album " + UUID.randomUUID());
        album.setSlug("moderation-album-" + UUID.randomUUID().toString().substring(0, 8));
        album.setPublished(true);
        return albums.saveAndFlush(album);
    }
}
