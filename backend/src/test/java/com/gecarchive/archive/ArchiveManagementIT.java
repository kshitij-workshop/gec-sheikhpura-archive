package com.gecarchive.archive;

import java.time.LocalDate;
import java.util.UUID;

import com.gecarchive.event.entity.AcademicYear;
import com.gecarchive.event.entity.Category;
import com.gecarchive.event.entity.Event;
import com.gecarchive.album.repository.AlbumRepository;
import com.gecarchive.audit.repository.AuditLogRepository;
import com.gecarchive.event.repository.AcademicYearRepository;
import com.gecarchive.event.repository.CategoryRepository;
import com.gecarchive.event.repository.EventRepository;
import com.gecarchive.support.AbstractAuthIntegrationTest;
import com.gecarchive.user.entity.Role;
import com.gecarchive.user.entity.User;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ArchiveManagementIT extends AbstractAuthIntegrationTest {

    @Autowired
    private AcademicYearRepository academicYears;

    @Autowired
    private CategoryRepository categories;

    @Autowired
    private EventRepository events;

    @Autowired
    private AlbumRepository albums;

    @Autowired
    private AuditLogRepository auditLogs;

    @Test
    void guestCanBrowsePublishedArchiveData() throws Exception {
        User admin = createActiveUser(uniqueEmail("archive-admin"), defaultPassword(), Role.ADMIN);
        AcademicYear year = createYear("2025-2026", LocalDate.of(2025, 7, 1), LocalDate.of(2026, 6, 30));
        Category category = createCategory("Annual Function", "annual-function");
        Event event = createEvent(year, category, admin, "Annual Function", "annual-function-2025", true);
        createAlbum(event, admin, "Main Gallery", "main-gallery-2025", true);

        mockMvc.perform(get("/api/v1/events"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.items[?(@.slug == 'annual-function-2025')]").isNotEmpty());

        mockMvc.perform(get("/api/v1/academic-years"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.label == '2025-2026')]").isNotEmpty());

        mockMvc.perform(get("/api/v1/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.slug == 'annual-function')]").isNotEmpty());

        mockMvc.perform(get("/api/v1/events/" + event.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.albums[0].slug").value("main-gallery-2025"));
    }

    @Test
    void unpublishedAndArchivedResourcesAreNotPublic() throws Exception {
        User admin = createActiveUser(uniqueEmail("archive-hidden"), defaultPassword(), Role.ADMIN);
        AcademicYear year = createYear("2026-2027", LocalDate.of(2026, 7, 1), LocalDate.of(2027, 6, 30));
        Category category = createCategory("Private Category", "private-category");
        Event event = createEvent(year, category, admin, "Private Event", "private-event", false);

        mockMvc.perform(get("/api/v1/events/" + event.getId()))
                .andExpect(status().isNotFound());

        event.setPublished(true);
        event.setDeletedAt(java.time.Instant.now());
        events.saveAndFlush(event);

        mockMvc.perform(get("/api/v1/events/" + event.getId()))
                .andExpect(status().isNotFound());
    }

    @Test
    void adminCanManageArchiveStructureAndActionsAreAudited() throws Exception {
        String email = uniqueEmail("archive-manager");
        createActiveUser(email, defaultPassword(), Role.ADMIN);
        String token = accessToken(login(email, defaultPassword()));
        String auth = "Bearer " + token;

        String yearBody = """
                {"label":"2027-2028","startDate":"2027-07-01","endDate":"2028-06-30"}
                """;
        var yearResult = mockMvc.perform(post("/api/v1/admin/academic-years")
                        .header(HttpHeaders.AUTHORIZATION, auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(yearBody))
                .andExpect(status().isCreated())
                .andReturn();
        String yearId = json(yearResult, "$.id");

        var categoryResult = mockMvc.perform(post("/api/v1/admin/categories")
                        .header(HttpHeaders.AUTHORIZATION, auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Sports Day","description":"Annual sports"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.slug").value("sports-day"))
                .andReturn();
        String categoryId = json(categoryResult, "$.id");

        var eventResult = mockMvc.perform(post("/api/v1/admin/events")
                        .header(HttpHeaders.AUTHORIZATION, auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"academicYearId":"%s","categoryId":"%s","title":"Sports Day","eventDate":"2027-09-10","published":true}
                                """.formatted(yearId, categoryId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.slug").value("sports-day"))
                .andReturn();
        String eventId = json(eventResult, "$.id");

        mockMvc.perform(post("/api/v1/admin/albums")
                        .header(HttpHeaders.AUTHORIZATION, auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"eventId":"%s","title":"Highlights","published":true}
                                """.formatted(eventId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.slug").value("highlights"));

        mockMvc.perform(delete("/api/v1/admin/events/" + eventId)
                        .header(HttpHeaders.AUTHORIZATION, auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.published").value(false));

        assertThat(auditLogs.findAll().stream().anyMatch(audit -> "EVENT_CREATED".equals(audit.getAction()))).isTrue();
        assertThat(auditLogs.findAll().stream().anyMatch(audit -> "EVENT_ARCHIVED".equals(audit.getAction()))).isTrue();
    }

    @Test
    void regularUsersCannotManageArchiveStructure() throws Exception {
        String email = uniqueEmail("archive-user");
        String token = loginAfterCreating(email);

        mockMvc.perform(post("/api/v1/admin/categories")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Not Allowed"}
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void eventDateMustFallWithinAcademicYear() throws Exception {
        String email = uniqueEmail("date-rule");
        createActiveUser(email, defaultPassword(), Role.ADMIN);
        String token = accessToken(login(email, defaultPassword()));
        AcademicYear year = createYear("2028-2029", LocalDate.of(2028, 7, 1), LocalDate.of(2029, 6, 30));
        Category category = createCategory("Date Rule", "date-rule");

        mockMvc.perform(post("/api/v1/admin/events")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"academicYearId":"%s","categoryId":"%s","title":"Outside","eventDate":"2030-01-01"}
                                """.formatted(year.getId(), category.getId())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void duplicateSlugsAreRejected() throws Exception {
        String email = uniqueEmail("slug-rule");
        createActiveUser(email, defaultPassword(), Role.ADMIN);
        String token = accessToken(login(email, defaultPassword()));
        AcademicYear year = createYear("2029-2030", LocalDate.of(2029, 7, 1), LocalDate.of(2030, 6, 30));
        Category category = createCategory("Slug Rule", "slug-rule");

        String body = """
                {"academicYearId":"%s","categoryId":"%s","title":"First","slug":"same-slug","eventDate":"2029-08-01"}
                """.formatted(year.getId(), category.getId());
        mockMvc.perform(post("/api/v1/admin/events").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/v1/admin/events").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict());
    }

    @Test
    void albumTitlesAreUniquePerEventButReusableAcrossEvents() throws Exception {
        String email = uniqueEmail("album-titles");
        User admin = createActiveUser(email, defaultPassword(), Role.ADMIN);
        String token = accessToken(login(email, defaultPassword()));
        AcademicYear year = createYear("2024-2025", LocalDate.of(2024, 7, 1), LocalDate.of(2025, 6, 30));
        Category category = createCategory("Dandiya", "dandiya");
        Event dandiya2024 = createEvent(year, category, admin, "Dandiya 2024", "dandiya-2024", false);
        Event dandiya2025 = createEvent(year, category, admin, "Dandiya 2025", "dandiya-2025", false);

        String firstAlbum = """
                {"eventId":"%s","title":"2K24 Batch"}
                """.formatted(dandiya2024.getId());
        mockMvc.perform(post("/api/v1/admin/albums").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(firstAlbum))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.slug").value("2k24-batch"));

        // The same title in a different event is allowed and gets its own slug.
        mockMvc.perform(post("/api/v1/admin/albums").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"eventId":"%s","title":"2K24 Batch"}
                                """.formatted(dandiya2025.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.slug").value("2k24-batch-2"))
                .andExpect(jsonPath("$.title").value("2K24 Batch"));

        // The same title twice inside one event is rejected.
        mockMvc.perform(post("/api/v1/admin/albums").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"eventId":"%s","title":"2K24 BATCH"}
                                """.formatted(dandiya2024.getId())))
                .andExpect(status().isConflict());
    }

    @Test
    void adminsCanRenameEventsAndAlbums() throws Exception {
        String email = uniqueEmail("rename");
        User admin = createActiveUser(email, defaultPassword(), Role.ADMIN);
        String token = accessToken(login(email, defaultPassword()));
        AcademicYear year = createYear("2023-2024", LocalDate.of(2023, 7, 1), LocalDate.of(2024, 6, 30));
        Category category = createCategory("Athletics", "athletics");
        Event event = createEvent(year, category, admin, "Inter House Sports", "inter-house-sports", false);
        var album = createAlbum(event, admin, "Track Events", "track-events", false);

        mockMvc.perform(patch("/api/v1/admin/events/" + event.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"academicYearId":"%s","categoryId":"%s","title":"Annual Sports Day",
                                 "description":"Updated description","eventDate":"%s","location":"Main ground"}
                                """.formatted(year.getId(), category.getId(), event.getEventDate())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Annual Sports Day"))
                .andExpect(jsonPath("$.location").value("Main ground"));

        mockMvc.perform(patch("/api/v1/admin/albums/" + album.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"eventId":"%s","title":"Athletics","description":"Relay and sprints","sortOrder":2}
                                """.formatted(event.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Athletics"))
                .andExpect(jsonPath("$.description").value("Relay and sprints"))
                .andExpect(jsonPath("$.sortOrder").value(2));
    }

    private User adminUser() {
        return createActiveUser(uniqueEmail("helper-admin"), defaultPassword(), Role.ADMIN);
    }

    private AcademicYear createYear(String label, LocalDate start, LocalDate end) {
        AcademicYear year = new AcademicYear();
        year.setLabel(label);
        year.setStartDate(start);
        year.setEndDate(end);
        return academicYears.saveAndFlush(year);
    }

    private Category createCategory(String name, String slug) {
        Category category = new Category();
        category.setName(name);
        category.setSlug(slug);
        return categories.saveAndFlush(category);
    }

    private Event createEvent(AcademicYear year, Category category, User creator, String title, String slug,
            boolean published) {
        Event event = new Event();
        event.setAcademicYear(year);
        event.setCategory(category);
        event.setCreatedBy(creator);
        event.setTitle(title);
        event.setSlug(slug);
        event.setEventDate(year.getStartDate().plusDays(10));
        event.setPublished(published);
        return events.saveAndFlush(event);
    }

    private com.gecarchive.album.entity.Album createAlbum(Event event, User creator, String title, String slug,
            boolean published) {
        var album = new com.gecarchive.album.entity.Album();
        album.setEvent(event);
        album.setCreatedBy(creator);
        album.setTitle(title);
        album.setSlug(slug);
        album.setPublished(published);
        return albums.saveAndFlush(album);
    }

    private String loginAfterCreating(String email) throws Exception {
        createActiveUser(email, defaultPassword(), Role.USER);
        return accessToken(login(email, defaultPassword()));
    }

    private String json(org.springframework.test.web.servlet.MvcResult result, String path) throws Exception {
        return com.jayway.jsonpath.JsonPath.read(result.getResponse().getContentAsString(), path);
    }
}
