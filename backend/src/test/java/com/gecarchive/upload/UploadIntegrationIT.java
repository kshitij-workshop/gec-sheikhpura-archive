package com.gecarchive.upload;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.gecarchive.album.entity.Album;
import com.gecarchive.album.repository.AlbumRepository;
import com.gecarchive.event.entity.AcademicYear;
import com.gecarchive.event.entity.Category;
import com.gecarchive.event.entity.Event;
import com.gecarchive.event.repository.AcademicYearRepository;
import com.gecarchive.event.repository.CategoryRepository;
import com.gecarchive.event.repository.EventRepository;
import com.gecarchive.photo.entity.PhotoStatus;
import com.gecarchive.photo.repository.PhotoPhotographerRepository;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UploadIntegrationIT extends AbstractAuthIntegrationTest {

    @Autowired
    private AcademicYearRepository academicYears;

    @Autowired
    private CategoryRepository categories;

    @Autowired
    private EventRepository events;

    @Autowired
    private AlbumRepository albums;

    @Autowired
    private PhotoSubmissionRepository submissions;

    @Autowired
    private PhotoRepository photos;

    @Autowired
    private PhotoPhotographerRepository photographers;

    @Autowired
    private CapturingCloudinaryAssetVerifier cloudinary;

    @BeforeEach
    void clearAssets() {
        cloudinary.clear();
    }

    @Test
    void authorizedAssetIsVerifiedAndRegisteredAsPendingWithPhotographerCredits() throws Exception {
        User user = createActiveUser(uniqueEmail("uploader"), defaultPassword(), Role.USER);
        Event event = event(user);
        Album album = album(event, user);
        String token = accessToken(login(user.getEmail(), defaultPassword()));
        String auth = "Bearer " + token;

        String submissionId = submission(auth, event.getId(), album.getId());
        MvcResult authorization = mockMvc.perform(post("/api/v1/me/uploads/authorize")
                        .header(HttpHeaders.AUTHORIZATION, auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"submissionId":"%s"}
                                """.formatted(submissionId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.publicId").exists())
                .andExpect(jsonPath("$.maxFileSizeBytes").value(15728640))
                .andExpect(jsonPath("$.allowedFormats").isArray())
                .andReturn();

        String authorizationId = json(authorization, "$.authorizationId");
        String publicId = json(authorization, "$.publicId");
        cloudinary.put(new CloudinaryAsset("asset-verified", publicId, "image", "upload", "jpg",
                1600, 1067, 2_000_000, Instant.now()));

        MvcResult registered = mockMvc.perform(post("/api/v1/me/submissions/" + submissionId + "/photos")
                        .header(HttpHeaders.AUTHORIZATION, auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"authorizationId":"%s","publicId":"%s","title":"Campus","altText":"Campus view","photographers":[{"creditName":"Archive Contributor"}]}
                                """.formatted(authorizationId, publicId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.photographers[0].creditName").value("Archive Contributor"))
                .andReturn();

        String photoId = json(registered, "$.id");
        var photo = photos.findById(UUID.fromString(photoId)).orElseThrow();
        assertThat(photo.getStatus()).isEqualTo(PhotoStatus.PENDING);
        assertThat(photo.getCloudinaryPublicId()).isEqualTo(publicId);
        assertThat(photographers.findByPhoto_IdOrderByCreditOrderAsc(photo.getId())).hasSize(1);
    }

    @Test
    void unverifiedAssetCannotBecomeAPhoto() throws Exception {
        User user = createActiveUser(uniqueEmail("unverified"), defaultPassword(), Role.USER);
        Event event = event(user);
        Album album = album(event, user);
        String token = accessToken(login(user.getEmail(), defaultPassword()));
        String auth = "Bearer " + token;
        String submissionId = submission(auth, event.getId(), album.getId());

        MvcResult authorization = mockMvc.perform(post("/api/v1/me/uploads/authorize")
                        .header(HttpHeaders.AUTHORIZATION, auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"submissionId\":\"%s\"}".formatted(submissionId)))
                .andExpect(status().isOk()).andReturn();
        String authorizationId = json(authorization, "$.authorizationId");
        String publicId = json(authorization, "$.publicId");

        mockMvc.perform(post("/api/v1/me/submissions/" + submissionId + "/photos")
                        .header(HttpHeaders.AUTHORIZATION, auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"authorizationId":"%s","publicId":"%s","photographers":[{"creditName":"Unknown"}]}
                                """.formatted(authorizationId, publicId)))
                .andExpect(status().isBadRequest());

        assertThat(photos.findAll()).noneMatch(photo -> publicId.equals(photo.getCloudinaryPublicId()));
    }

    @Test
    void invalidFormatAndOversizedAssetsAreRejected() throws Exception {
        User user = createActiveUser(uniqueEmail("invalid-asset"), defaultPassword(), Role.USER);
        Event event = event(user);
        Album album = album(event, user);
        String token = accessToken(login(user.getEmail(), defaultPassword()));
        String auth = "Bearer " + token;
        String submissionId = submission(auth, event.getId(), album.getId());
        MvcResult authorization = mockMvc.perform(post("/api/v1/me/uploads/authorize")
                        .header(HttpHeaders.AUTHORIZATION, auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"submissionId\":\"%s\"}".formatted(submissionId)))
                .andExpect(status().isOk()).andReturn();
        String authorizationId = json(authorization, "$.authorizationId");
        String publicId = json(authorization, "$.publicId");
        cloudinary.put(new CloudinaryAsset("asset-bad", publicId, "image", "upload", "gif",
                100, 100, 100, Instant.now()));

        mockMvc.perform(post("/api/v1/me/submissions/" + submissionId + "/photos")
                        .header(HttpHeaders.AUTHORIZATION, auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"authorizationId":"%s","publicId":"%s","photographers":[{"creditName":"Contributor"}]}
                                """.formatted(authorizationId, publicId)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void authorizationAndRegistrationAreOwnedByTheSubmittingUser() throws Exception {
        User owner = createActiveUser(uniqueEmail("owner"), defaultPassword(), Role.USER);
        User other = createActiveUser(uniqueEmail("other"), defaultPassword(), Role.USER);
        Event event = event(owner);
        Album album = album(event, owner);
        String ownerToken = accessToken(login(owner.getEmail(), defaultPassword()));
        String otherToken = accessToken(login(other.getEmail(), defaultPassword()));
        String submissionId = submission("Bearer " + ownerToken, event.getId(), album.getId());

        mockMvc.perform(post("/api/v1/me/uploads/authorize")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + otherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"submissionId\":\"%s\"}".formatted(submissionId)))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/v1/me/submissions")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + otherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isEmpty());
    }

    @Test
    void anAuthorizationCannotBeUsedTwice() throws Exception {
        User user = createActiveUser(uniqueEmail("single-use"), defaultPassword(), Role.USER);
        Event event = event(user);
        Album album = album(event, user);
        String auth = "Bearer " + accessToken(login(user.getEmail(), defaultPassword()));
        String submissionId = submission(auth, event.getId(), album.getId());
        MvcResult authorization = mockMvc.perform(post("/api/v1/me/uploads/authorize")
                        .header(HttpHeaders.AUTHORIZATION, auth).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"submissionId\":\"%s\"}".formatted(submissionId)))
                .andExpect(status().isOk()).andReturn();
        String authorizationId = json(authorization, "$.authorizationId");
        String publicId = json(authorization, "$.publicId");
        cloudinary.put(new CloudinaryAsset("asset-single", publicId, "image", "upload", "png",
                800, 600, 500_000, Instant.now()));
        String body = """
                {"authorizationId":"%s","publicId":"%s","photographers":[{"creditName":"Contributor"}]}
                """.formatted(authorizationId, publicId);

        mockMvc.perform(post("/api/v1/me/submissions/" + submissionId + "/photos")
                        .header(HttpHeaders.AUTHORIZATION, auth).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/v1/me/submissions/" + submissionId + "/photos")
                        .header(HttpHeaders.AUTHORIZATION, auth).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void aSubmissionMustTargetAnAlbumOfTheChosenEvent() throws Exception {
        User user = createActiveUser(uniqueEmail("album-required"), defaultPassword(), Role.USER);
        Event event = event(user);
        String auth = "Bearer " + accessToken(login(user.getEmail(), defaultPassword()));

        mockMvc.perform(post("/api/v1/me/submissions")
                        .header(HttpHeaders.AUTHORIZATION, auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"eventId":"%s","note":"No album supplied"}
                                """.formatted(event.getId())))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/v1/me/submissions")
                        .header(HttpHeaders.AUTHORIZATION, auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"eventId":"%s","albumId":null,"note":"Null album supplied"}
                                """.formatted(event.getId())))
                .andExpect(status().isBadRequest());

        Event otherEvent = event(user);
        Album foreignAlbum = album(otherEvent, user);
        mockMvc.perform(post("/api/v1/me/submissions")
                        .header(HttpHeaders.AUTHORIZATION, auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"eventId":"%s","albumId":"%s","note":"Foreign album"}
                                """.formatted(event.getId(), foreignAlbum.getId())))
                .andExpect(status().isBadRequest());
    }

    private String submission(String auth, UUID eventId, UUID albumId) throws Exception {
        String albumJson = albumId == null ? "null" : "\"" + albumId + "\"";
        MvcResult result = mockMvc.perform(post("/api/v1/me/submissions")
                        .header(HttpHeaders.AUTHORIZATION, auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"eventId":"%s","albumId":%s,"note":"Test upload"}
                                """.formatted(eventId, albumJson)))
                .andExpect(status().isCreated()).andReturn();
        return json(result, "$.id");
    }

    private Event event(User creator) {
        AcademicYear year = new AcademicYear();
        year.setLabel("2035-2036-" + UUID.randomUUID().toString().substring(0, 8));
        year.setStartDate(LocalDate.of(2035, 7, 1));
        year.setEndDate(LocalDate.of(2036, 6, 30));
        academicYears.save(year);
        Category category = new Category();
        category.setName("Upload Category " + UUID.randomUUID());
        category.setSlug("upload-category-" + UUID.randomUUID().toString().substring(0, 8));
        categories.save(category);
        Event event = new Event();
        event.setAcademicYear(year);
        event.setCategory(category);
        event.setCreatedBy(creator);
        event.setTitle("Upload Event " + UUID.randomUUID());
        event.setSlug("upload-event-" + UUID.randomUUID().toString().substring(0, 8));
        event.setEventDate(LocalDate.of(2035, 8, 1));
        event.setPublished(true);
        return events.saveAndFlush(event);
    }

    private Album album(Event event, User creator) {
        Album album = new Album();
        album.setEvent(event);
        album.setCreatedBy(creator);
        album.setTitle("Upload Album " + UUID.randomUUID());
        album.setSlug("upload-album-" + UUID.randomUUID().toString().substring(0, 8));
        album.setPublished(true);
        return albums.saveAndFlush(album);
    }

    private String json(MvcResult result, String path) throws Exception {
        return JsonPath.read(result.getResponse().getContentAsString(), path);
    }
}
