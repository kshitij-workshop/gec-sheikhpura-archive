package com.gecarchive.support;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.gecarchive.AbstractIntegrationTest;
import com.gecarchive.album.entity.Album;
import com.gecarchive.album.repository.AlbumRepository;
import com.gecarchive.audit.repository.AuditLogRepository;
import com.gecarchive.contributor.repository.ContributorProfileRepository;
import com.gecarchive.event.entity.AcademicYear;
import com.gecarchive.event.entity.Category;
import com.gecarchive.event.entity.Event;
import com.gecarchive.event.repository.AcademicYearRepository;
import com.gecarchive.event.repository.CategoryRepository;
import com.gecarchive.event.repository.EventRepository;
import com.gecarchive.moderation.repository.PhotoModerationRepository;
import com.gecarchive.moderation.repository.PhotoRemovalRequestRepository;
import com.gecarchive.moderation.repository.PhotoReportRepository;
import com.gecarchive.photo.entity.Photo;
import com.gecarchive.photo.entity.PhotoStatus;
import com.gecarchive.photo.entity.PhotoSubmission;
import com.gecarchive.photo.entity.SubmissionStatus;
import com.gecarchive.photo.repository.PhotoPhotographerRepository;
import com.gecarchive.photo.repository.PhotoRepository;
import com.gecarchive.photo.repository.PhotoSubmissionRepository;
import com.gecarchive.user.entity.Role;
import com.gecarchive.user.entity.User;
import com.gecarchive.user.entity.UserStatus;
import com.gecarchive.user.repository.UserRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
public abstract class AbstractDomainIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    protected UserRepository users;

    @Autowired
    protected AcademicYearRepository academicYears;

    @Autowired
    protected CategoryRepository categories;

    @Autowired
    protected EventRepository events;

    @Autowired
    protected AlbumRepository albums;

    @Autowired
    protected PhotoSubmissionRepository submissions;

    @Autowired
    protected PhotoRepository photos;

    @Autowired
    protected PhotoPhotographerRepository photographers;

    @Autowired
    protected PhotoModerationRepository moderations;

    @Autowired
    protected PhotoReportRepository reports;

    @Autowired
    protected PhotoRemovalRequestRepository removalRequests;

    @Autowired
    protected ContributorProfileRepository contributors;

    @Autowired
    protected AuditLogRepository auditLogs;

    protected String uniqueSuffix() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    protected User admin() {
        return user("admin", Role.ADMIN);
    }

    protected User activeUser() {
        return user("user", Role.USER);
    }

    private User user(String prefix, Role role) {
        String suffix = uniqueSuffix();
        User user = new User();
        user.setEmail(prefix + "-" + suffix + "@example.test");
        user.setPasswordHash("$2a$12$test-only-not-a-real-hash");
        user.setDisplayName("Test " + prefix + " " + suffix);
        user.setRole(role);
        user.setStatus(UserStatus.ACTIVE);
        user.setEmailVerifiedAt(Instant.now());
        return users.saveAndFlush(user);
    }

    protected AcademicYear academicYear() {
        String suffix = uniqueSuffix();
        AcademicYear year = new AcademicYear();
        year.setLabel("2024-2025-" + suffix);
        year.setStartDate(LocalDate.of(2024, 7, 1));
        year.setEndDate(LocalDate.of(2025, 6, 30));
        return academicYears.saveAndFlush(year);
    }

    protected Category category() {
        String suffix = uniqueSuffix();
        Category category = new Category();
        category.setName("Category " + suffix);
        category.setSlug("category-" + suffix);
        category.setSortOrder(0);
        return categories.saveAndFlush(category);
    }

    protected Event event(AcademicYear year, Category category, User creator) {
        return event(year, category, creator, true);
    }

    protected Event event(AcademicYear year, Category category, User creator, boolean published) {
        String suffix = uniqueSuffix();
        Event event = new Event();
        event.setAcademicYear(year);
        event.setCategory(category);
        event.setCreatedBy(creator);
        event.setTitle("Event " + suffix);
        event.setSlug("event-" + suffix);
        event.setEventDate(LocalDate.of(2025, 1, 15));
        event.setPublished(published);
        return events.saveAndFlush(event);
    }

    protected Album album(Event event, User creator) {
        return album(event, creator, true);
    }

    protected Album album(Event event, User creator, boolean published) {
        String suffix = uniqueSuffix();
        Album album = new Album();
        album.setEvent(event);
        album.setCreatedBy(creator);
        album.setTitle("Album " + suffix);
        album.setSlug("album-" + suffix);
        album.setPublished(published);
        return albums.saveAndFlush(album);
    }

    protected PhotoSubmission submission(User submitter, Event event, Album album) {
        PhotoSubmission submission = new PhotoSubmission();
        submission.setSubmittedBy(submitter);
        submission.setEvent(event);
        submission.setAlbum(album);
        submission.setStatus(SubmissionStatus.PENDING);
        return submissions.saveAndFlush(submission);
    }

    protected Photo photo(User uploader, Event event, Album album, PhotoStatus status) {
        return photo(uploader, event, album, status, null, null);
    }

    protected Photo approvedPhoto(User uploader, Event event, Album album, User approver) {
        return photo(uploader, event, album, PhotoStatus.APPROVED, approver, Instant.now());
    }

    protected Photo photo(
            User uploader,
            Event event,
            Album album,
            PhotoStatus status,
            User approver,
            Instant approvedAt) {
        String suffix = uniqueSuffix();
        Photo photo = new Photo();
        photo.setEvent(event);
        photo.setAlbum(album);
        photo.setUploadedBy(uploader);
        photo.setApprovedBy(approver);
        photo.setApprovedAt(approvedAt);
        photo.setCloudinaryPublicId("gecs/" + suffix);
        photo.setCloudinaryAssetId("asset-" + suffix);
        photo.setFormat("jpg");
        photo.setWidthPx(1600);
        photo.setHeightPx(1067);
        photo.setSizeBytes(2_400_000L);
        photo.setStatus(status);
        return photos.saveAndFlush(photo);
    }
}
