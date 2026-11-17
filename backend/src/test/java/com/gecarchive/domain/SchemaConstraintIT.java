package com.gecarchive.domain;

import java.time.Instant;

import com.gecarchive.album.entity.Album;
import com.gecarchive.event.entity.AcademicYear;
import com.gecarchive.event.entity.Event;
import com.gecarchive.moderation.entity.PhotoRemovalRequest;
import com.gecarchive.moderation.entity.PhotoReport;
import com.gecarchive.moderation.entity.ReportCategory;
import com.gecarchive.photo.entity.Photo;
import com.gecarchive.photo.entity.PhotoStatus;
import com.gecarchive.photo.entity.PhotoSubmission;
import com.gecarchive.photo.entity.SubmissionStatus;
import com.gecarchive.support.AbstractDomainIntegrationTest;
import com.gecarchive.user.entity.Role;
import com.gecarchive.user.entity.User;
import com.gecarchive.user.entity.UserStatus;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SchemaConstraintIT extends AbstractDomainIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void rejectsGuestAsPersistedRole() {
        User user = new User();
        user.setEmail("guest-" + uniqueSuffix() + "@example.test");
        user.setPasswordHash("$2a$12$test-only-not-a-real-hash");
        user.setDisplayName("Guest");
        user.setRole(Role.GUEST);
        user.setStatus(UserStatus.ACTIVE);

        assertThatThrownBy(() -> users.saveAndFlush(user))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void rejectsAnAccountWithNeitherPasswordNorGoogleSubject() {
        User user = new User();
        user.setEmail("credentialless-" + uniqueSuffix() + "@example.test");
        user.setDisplayName("No Credential");
        user.setStatus(UserStatus.ACTIVE);

        assertThatThrownBy(() -> users.saveAndFlush(user))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void allowsAnAccountWithoutAPasswordWhenGoogleIsLinked() {
        User user = new User();
        user.setEmail("google-" + uniqueSuffix() + "@example.test");
        user.setDisplayName("Google Only");
        user.setStatus(UserStatus.ACTIVE);
        user.setGoogleSubject("google-subject-" + uniqueSuffix());

        assertThat(users.saveAndFlush(user).getId()).isNotNull();
    }

    @Test
    void rejectsTheSameGoogleSubjectOnTwoAccounts() {
        String subject = "google-subject-" + uniqueSuffix();
        User first = new User();
        first.setEmail("first-" + uniqueSuffix() + "@example.test");
        first.setDisplayName("First");
        first.setStatus(UserStatus.ACTIVE);
        first.setGoogleSubject(subject);
        users.saveAndFlush(first);

        User second = new User();
        second.setEmail("second-" + uniqueSuffix() + "@example.test");
        second.setDisplayName("Second");
        second.setStatus(UserStatus.ACTIVE);
        second.setGoogleSubject(subject);

        assertThatThrownBy(() -> users.saveAndFlush(second))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void rejectsCaseInsensitiveDuplicateEmail() {
        User first = activeUser();
        User duplicate = new User();
        duplicate.setEmail(first.getEmail().toUpperCase());
        duplicate.setPasswordHash("$2a$12$test-only-not-a-real-hash");
        duplicate.setDisplayName("Duplicate Email");
        duplicate.setStatus(UserStatus.ACTIVE);

        assertThatThrownBy(() -> users.saveAndFlush(duplicate))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void rejectsAcademicYearWithInvalidDateRange() {
        AcademicYear year = new AcademicYear();
        year.setLabel("invalid-" + uniqueSuffix());
        year.setStartDate(java.time.LocalDate.of(2025, 7, 1));
        year.setEndDate(java.time.LocalDate.of(2024, 6, 30));

        assertThatThrownBy(() -> academicYears.saveAndFlush(year))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void rejectsApprovedPhotoWithoutAlbum() {
        User admin = admin();
        User uploader = activeUser();
        var event = event(academicYear(), category(), admin);

        assertThatThrownBy(() -> photo(uploader, event, null, PhotoStatus.APPROVED, admin, Instant.now()))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void rejectsApprovedPhotoWithoutModeratorMetadata() {
        User admin = admin();
        User uploader = activeUser();
        var event = event(academicYear(), category(), admin);
        Album album = album(event, admin);

        assertThatThrownBy(() -> photo(uploader, event, album, PhotoStatus.APPROVED, null, null))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void rejectsAlbumFromAnotherEvent() {
        User admin = admin();
        User uploader = activeUser();
        var year = academicYear();
        var category = category();
        Event firstEvent = event(year, category, admin);
        Event secondEvent = event(year, category, admin);
        Album secondAlbum = album(secondEvent, admin);

        assertThatThrownBy(() -> photo(uploader, firstEvent, secondAlbum, PhotoStatus.PENDING))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void rejectsSubmissionWithAlbumFromAnotherEvent() {
        User admin = admin();
        User submitter = activeUser();
        var year = academicYear();
        var category = category();
        Event firstEvent = event(year, category, admin);
        Event secondEvent = event(year, category, admin);
        Album albumOfSecondEvent = album(secondEvent, admin);

        PhotoSubmission submission = new PhotoSubmission();
        submission.setSubmittedBy(submitter);
        submission.setEvent(firstEvent);
        submission.setAlbum(albumOfSecondEvent);
        submission.setStatus(SubmissionStatus.PENDING);

        assertThatThrownBy(() -> submissions.saveAndFlush(submission))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void allowsPhotoEventToDifferFromItsSubmissionEvent() {
        User admin = admin();
        User submitter = activeUser();
        var year = academicYear();
        var category = category();
        Event firstEvent = event(year, category, admin);
        Event secondEvent = event(year, category, admin);
        PhotoSubmission submissionForSecondEvent = submission(submitter, secondEvent, null);
        Photo photo = photo(submitter, firstEvent, null, PhotoStatus.PENDING);

        // An administrator may re-file a photograph into another event. The
        // submission stays attached as provenance; only the photo's event and
        // album move together under photos_album_event_fk.
        photo.setSubmission(submissionForSecondEvent);

        Photo saved = photos.saveAndFlush(photo);

        assertThat(saved.getSubmission().getId()).isEqualTo(submissionForSecondEvent.getId());
        assertThat(saved.getEvent().getId()).isEqualTo(firstEvent.getId());
    }

    @Test
    void rejectsDuplicateOpenReportFromSameUser() {
        User admin = admin();
        User reporter = activeUser();
        var event = event(academicYear(), category(), admin);
        Photo photo = photo(reporter, event, null, PhotoStatus.PENDING);

        reports.saveAndFlush(report(photo, reporter));
        PhotoReport duplicate = report(photo, reporter);

        assertThatThrownBy(() -> reports.saveAndFlush(duplicate))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void rejectsDuplicatePendingRemovalRequestFromSameUser() {
        User admin = admin();
        User owner = activeUser();
        var event = event(academicYear(), category(), admin);
        Photo photo = photo(owner, event, null, PhotoStatus.PENDING);

        removalRequests.saveAndFlush(removalRequest(photo, owner));
        PhotoRemovalRequest duplicate = removalRequest(photo, owner);

        assertThatThrownBy(() -> removalRequests.saveAndFlush(duplicate))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void rejectsModerationHistoryUpdates() {
        User admin = admin();
        User uploader = activeUser();
        var event = event(academicYear(), category(), admin);
        Photo photo = photo(uploader, event, null, PhotoStatus.PENDING);

        var moderation = new com.gecarchive.moderation.entity.PhotoModeration();
        moderation.setPhoto(photo);
        moderation.setActor(admin);
        moderation.setActorRole(Role.ADMIN);
        moderation.setActorDisplayName(admin.getDisplayName());
        moderation.setAction(com.gecarchive.moderation.entity.ModerationAction.SUBMIT);
        moderation.setToStatus(PhotoStatus.PENDING);
        moderations.saveAndFlush(moderation);

        assertThatThrownBy(() -> jdbcTemplate.update(
                "update photo_moderations set reason = ? where id = ?",
                "rewritten",
                moderation.getId()))
                .isInstanceOf(org.springframework.dao.DataAccessException.class);

        assertThat(moderations.findByPhoto_IdOrderByCreatedAtDesc(photo.getId()))
                .singleElement()
                .satisfies(saved -> assertThat(saved.getReason()).isNull());
    }

    @Test
    void rejectsAuditLogDeletion() {
        User admin = admin();
        var auditLog = new com.gecarchive.audit.entity.AuditLog();
        auditLog.setActor(admin);
        auditLog.setActorRole(Role.ADMIN);
        auditLog.setActorDisplayName(admin.getDisplayName());
        auditLog.setAction("TEST_ACTION");
        auditLog.setEntityType("TEST");
        auditLogs.saveAndFlush(auditLog);

        assertThatThrownBy(() -> jdbcTemplate.update(
                "delete from audit_logs where id = ?",
                auditLog.getId()))
                .isInstanceOf(org.springframework.dao.DataAccessException.class);

        assertThat(auditLogs.findById(auditLog.getId())).isPresent();
    }

    @Test
    void openReportIsVisibleOnlyOncePerUserAndPhoto() {
        User admin = admin();
        User reporter = activeUser();
        var event = event(academicYear(), category(), admin);
        Photo photo = photo(reporter, event, null, PhotoStatus.PENDING);
        reports.saveAndFlush(report(photo, reporter));

        assertThat(reports.findByStatusOrderByCreatedAtAsc(
                com.gecarchive.moderation.entity.ReportStatus.PENDING,
                PageRequest.of(0, 10)).getTotalElements())
                .isPositive();
    }

    private PhotoReport report(Photo photo, User reporter) {
        PhotoReport report = new PhotoReport();
        report.setPhoto(photo);
        report.setReportedBy(reporter);
        report.setCategory(ReportCategory.MISATTRIBUTION);
        report.setDetails("Credit appears incorrect.");
        return report;
    }

    private PhotoRemovalRequest removalRequest(Photo photo, User requester) {
        PhotoRemovalRequest request = new PhotoRemovalRequest();
        request.setPhoto(photo);
        request.setRequestedBy(requester);
        request.setReason("I am the photographer and withdraw consent.");
        return request;
    }
}
