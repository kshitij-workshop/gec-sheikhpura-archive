package com.gecarchive.archive;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.gecarchive.contributor.entity.ContributorProfile;
import com.gecarchive.contributor.repository.ContributorProfileRepository;
import com.gecarchive.event.entity.AcademicYear;
import com.gecarchive.event.entity.Category;
import com.gecarchive.event.entity.Event;
import com.gecarchive.event.repository.AcademicYearRepository;
import com.gecarchive.event.repository.CategoryRepository;
import com.gecarchive.event.repository.EventRepository;
import com.gecarchive.support.AbstractAuthIntegrationTest;
import com.gecarchive.user.entity.Role;
import com.gecarchive.user.entity.User;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PublicArchiveBrowseIT extends AbstractAuthIntegrationTest {

    @Autowired
    private AcademicYearRepository academicYears;

    @Autowired
    private CategoryRepository categories;

    @Autowired
    private EventRepository events;

    @Autowired
    private ContributorProfileRepository contributors;

    @Test
    void guestCanFilterPublishedEventsByYearCategoryFeatureAndTitle() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User admin = createActiveUser(uniqueEmail("browse-admin"), defaultPassword(), Role.ADMIN);
        AcademicYear year = createYear("2030-2031-" + suffix);
        AcademicYear otherYear = createYear("2031-2032-" + suffix);
        Category sports = createCategory("Sports " + suffix, "sports-" + suffix);
        Category culture = createCategory("Culture " + suffix, "culture-" + suffix);

        Event featured = createEvent(year, sports, admin, "Founders Sports " + suffix,
                "founders-sports-" + suffix, true, true);
        Event quiet = createEvent(year, sports, admin, "Quiet Sports " + suffix,
                "quiet-sports-" + suffix, true, false);
        Event other = createEvent(otherYear, culture, admin, "Culture Night " + suffix,
                "culture-night-" + suffix, true, true);
        Event draft = createEvent(year, sports, admin, "Draft Sports " + suffix,
                "draft-sports-" + suffix, false, true);
        Event archived = createEvent(year, sports, admin, "Archived Sports " + suffix,
                "archived-sports-" + suffix, true, true);
        archived.setDeletedAt(Instant.now());
        events.saveAndFlush(archived);

        mockMvc.perform(get("/api/v1/events")
                        .param("academicYearId", year.getId().toString())
                        .param("size", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].slug", hasItem(featured.getSlug())))
                .andExpect(jsonPath("$.items[*].slug", hasItem(quiet.getSlug())))
                .andExpect(jsonPath("$.items[*].slug", not(hasItem(other.getSlug()))))
                .andExpect(jsonPath("$.items[*].slug", not(hasItem(draft.getSlug()))))
                .andExpect(jsonPath("$.items[*].slug", not(hasItem(archived.getSlug()))));

        mockMvc.perform(get("/api/v1/events")
                        .param("categoryId", sports.getId().toString())
                        .param("size", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].slug", hasItem(featured.getSlug())))
                .andExpect(jsonPath("$.items[*].slug", not(hasItem(other.getSlug()))));

        mockMvc.perform(get("/api/v1/events")
                        .param("academicYearId", year.getId().toString())
                        .param("featured", "true")
                        .param("size", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].slug", hasItem(featured.getSlug())))
                .andExpect(jsonPath("$.items[*].slug", not(hasItem(quiet.getSlug()))))
                .andExpect(jsonPath("$.items[*].slug", not(hasItem(archived.getSlug()))));

        mockMvc.perform(get("/api/v1/events")
                        .param("query", "FOUNDERS")
                        .param("size", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].slug", hasItem(featured.getSlug())))
                .andExpect(jsonPath("$.items[*].slug", not(hasItem(quiet.getSlug()))));

        mockMvc.perform(get("/api/v1/events")
                        .param("query", "Quiet")
                        .param("categoryId", culture.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isEmpty());
    }

    @Test
    void eventPaginationIsBounded() throws Exception {
        mockMvc.perform(get("/api/v1/events")
                        .param("page", "-5")
                        .param("size", "1000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(100));
    }

    @Test
    void guestCanBrowseOnlyPublishedContributors() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        ContributorProfile visible = createContributor("Asha Verma " + suffix, "asha-" + suffix, true, null);
        ContributorProfile draft = createContributor("Draft Person " + suffix, "draft-" + suffix, false, null);
        ContributorProfile archived = createContributor("Archived Person " + suffix, "archived-" + suffix, true,
                Instant.now());

        mockMvc.perform(get("/api/v1/contributors")
                        .param("size", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(100))
                .andExpect(jsonPath("$.items[*].slug", hasItem(visible.getSlug())))
                .andExpect(jsonPath("$.items[*].slug", not(hasItem(draft.getSlug()))))
                .andExpect(jsonPath("$.items[*].slug", not(hasItem(archived.getSlug()))))
                .andExpect(jsonPath("$.items[0].email").doesNotExist());
    }

    @Test
    void contributorPaginationIsBounded() throws Exception {
        mockMvc.perform(get("/api/v1/contributors")
                        .param("page", "-2")
                        .param("size", "1000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(100));
    }

    private AcademicYear createYear(String label) {
        AcademicYear year = new AcademicYear();
        year.setLabel(label);
        year.setStartDate(LocalDate.of(2030, 7, 1));
        year.setEndDate(LocalDate.of(2031, 6, 30));
        return academicYears.saveAndFlush(year);
    }

    private Category createCategory(String name, String slug) {
        Category category = new Category();
        category.setName(name);
        category.setSlug(slug);
        return categories.saveAndFlush(category);
    }

    private Event createEvent(AcademicYear year, Category category, User creator, String title, String slug,
            boolean published, boolean featured) {
        Event event = new Event();
        event.setAcademicYear(year);
        event.setCategory(category);
        event.setCreatedBy(creator);
        event.setTitle(title);
        event.setSlug(slug);
        event.setEventDate(year.getStartDate().plusDays(10));
        event.setPublished(published);
        event.setFeatured(featured);
        return events.saveAndFlush(event);
    }

    private ContributorProfile createContributor(String displayName, String slug, boolean published,
            Instant deletedAt) {
        ContributorProfile profile = new ContributorProfile();
        profile.setDisplayName(displayName);
        profile.setSlug(slug);
        profile.setBio("Archive contributor");
        profile.setPublished(published);
        profile.setDeletedAt(deletedAt);
        return contributors.saveAndFlush(profile);
    }
}
