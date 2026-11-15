package com.gecarchive.domain;

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
import com.gecarchive.photo.entity.Photo;
import com.gecarchive.photo.entity.PhotoPhotographer;
import com.gecarchive.photo.entity.PhotoStatus;
import com.gecarchive.photo.entity.PhotoSubmission;
import com.gecarchive.photo.entity.SubmissionStatus;
import com.gecarchive.photo.repository.PhotoPhotographerRepository;
import com.gecarchive.photo.repository.PhotoRepository;
import com.gecarchive.photo.repository.PhotoSubmissionRepository;
import com.gecarchive.support.AbstractAuthIntegrationTest;
import com.gecarchive.user.entity.Role;
import com.gecarchive.user.entity.User;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The dashboard read model. Every endpoint here is scoped to the authenticated
 * uploader and must stay free of delivery identifiers.
 */
class MyContributionsIT extends AbstractAuthIntegrationTest {

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

    @Test
    void ownSubmissionsCarryEventAndAlbumTitles() throws Exception {
        User owner = createActiveUser(uniqueEmail("owner"), defaultPassword(), Role.USER);
        Event event = event();
        Album album = album(event);

        mockMvc.perform(post("/api/v1/me/submissions")
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"eventId":"%s","albumId":"%s","note":"Sports day"}
                                """.formatted(event.getId(), album.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.eventTitle").value(event.getTitle()))
                .andExpect(jsonPath("$.albumTitle").value(album.getTitle()));

        mockMvc.perform(get("/api/v1/me/submissions")
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].eventTitle").value(event.getTitle()))
                .andExpect(jsonPath("$.items[0].albumTitle").value(album.getTitle()))
                .andExpect(jsonPath("$.items[0].status").value("PENDING"));

        User other = createActiveUser(uniqueEmail("other"), defaultPassword(), Role.USER);
        mockMvc.perform(get("/api/v1/me/submissions")
                        .header(HttpHeaders.AUTHORIZATION, bearer(other)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isEmpty());
    }

    @Test
    void ownPhotosCarryAttributionAndTitlesWithoutDeliveryIdentifiers() throws Exception {
        User owner = createActiveUser(uniqueEmail("photos"), defaultPassword(), Role.USER);
        Event event = event();
        Album album = album(event);
        PhotoSubmission submission = submission(owner, event, album);
        Photo photo = photo(owner, submission, event, album);
        credit(photo, "Asha Verma", (short) 1);
        credit(photo, "Ravi Kumar", (short) 0);

        String body = mockMvc.perform(get("/api/v1/me/photos")
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].status").value("PENDING"))
                .andExpect(jsonPath("$.items[0].eventTitle").value(event.getTitle()))
                .andExpect(jsonPath("$.items[0].albumTitle").value(album.getTitle()))
                .andExpect(jsonPath("$.items[0].photographers[0].creditName").value("Ravi Kumar"))
                .andExpect(jsonPath("$.items[0].photographers[1].creditName").value("Asha Verma"))
                .andReturn().getResponse().getContentAsString();

        assertThat(body).doesNotContain("cloudinaryPublicId", "cloudinaryAssetId", "res.cloudinary.com");

        User other = createActiveUser(uniqueEmail("stranger"), defaultPassword(), Role.USER);
        mockMvc.perform(get("/api/v1/me/photos")
                        .header(HttpHeaders.AUTHORIZATION, bearer(other)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isEmpty());
    }

    @Test
    void ownSuggestionsCarryCategoryAndYearLabels() throws Exception {
        User user = createActiveUser(uniqueEmail("suggester"), defaultPassword(), Role.USER);
        Category category = category();
        AcademicYear year = academicYear();

        mockMvc.perform(post("/api/v1/me/event-suggestions")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Founders Day","categoryId":"%s","academicYearId":"%s"}
                                """.formatted(category.getId(), year.getId())))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/me/event-suggestions")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].categoryName").value(category.getName()))
                .andExpect(jsonPath("$.items[0].academicYearLabel").value(year.getLabel()))
                .andExpect(jsonPath("$.items[0].status").value("PENDING"));
    }

    private String bearer(User user) throws Exception {
        return "Bearer " + accessToken(login(user.getEmail(), defaultPassword()));
    }

    private AcademicYear academicYear() {
        AcademicYear year = new AcademicYear();
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        year.setLabel("2035-2036-" + suffix);
        year.setStartDate(LocalDate.of(2035, 7, 1));
        year.setEndDate(LocalDate.of(2036, 6, 30));
        return academicYears.saveAndFlush(year);
    }

    private Category category() {
        Category category = new Category();
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        category.setName("Category " + suffix);
        category.setSlug("category-" + suffix);
        category.setSortOrder(0);
        return categories.saveAndFlush(category);
    }

    private Event event() {
        Event event = new Event();
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        event.setAcademicYear(academicYear());
        event.setCategory(category());
        event.setCreatedBy(createActiveUser(uniqueEmail("creator"), defaultPassword(), Role.ADMIN));
        event.setTitle("Event " + suffix);
        event.setSlug("event-" + suffix);
        event.setEventDate(LocalDate.of(2025, 1, 15));
        event.setPublished(true);
        return events.saveAndFlush(event);
    }

    private Album album(Event event) {
        Album album = new Album();
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        album.setEvent(event);
        album.setCreatedBy(createActiveUser(uniqueEmail("album-owner"), defaultPassword(), Role.ADMIN));
        album.setTitle("Album " + suffix);
        album.setSlug("album-" + suffix);
        album.setPublished(true);
        return albums.saveAndFlush(album);
    }

    private PhotoSubmission submission(User submitter, Event event, Album album) {
        PhotoSubmission submission = new PhotoSubmission();
        submission.setSubmittedBy(submitter);
        submission.setEvent(event);
        submission.setAlbum(album);
        submission.setStatus(SubmissionStatus.PENDING);
        return submissions.saveAndFlush(submission);
    }

    private Photo photo(User uploader, PhotoSubmission submission, Event event, Album album) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Photo photo = new Photo();
        photo.setSubmission(submission);
        photo.setUploadedBy(uploader);
        photo.setEvent(event);
        photo.setAlbum(album);
        photo.setTitle("Opening ceremony");
        photo.setCloudinaryPublicId("gecs/" + suffix);
        photo.setCloudinaryAssetId("asset-" + suffix);
        photo.setFormat("jpg");
        photo.setWidthPx(1600);
        photo.setHeightPx(1067);
        photo.setSizeBytes(2_400_000L);
        photo.setStatus(PhotoStatus.PENDING);
        return photos.saveAndFlush(photo);
    }

    private void credit(Photo photo, String name, short order) {
        PhotoPhotographer credit = new PhotoPhotographer();
        credit.setPhoto(photo);
        credit.setCreditName(name);
        credit.setCreditOrder(order);
        photographers.saveAndFlush(credit);
    }
}
