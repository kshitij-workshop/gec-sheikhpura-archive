package com.gecarchive.domain;

import java.time.Instant;
import java.util.Map;

import com.gecarchive.audit.entity.AuditLog;
import com.gecarchive.contributor.entity.ContributorProfile;
import com.gecarchive.moderation.entity.ModerationAction;
import com.gecarchive.moderation.entity.PhotoModeration;
import com.gecarchive.photo.entity.PhotoPhotographer;
import com.gecarchive.photo.entity.PhotoStatus;
import com.gecarchive.support.AbstractDomainIntegrationTest;
import com.gecarchive.user.entity.Role;
import com.gecarchive.user.entity.User;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

class DomainPersistenceIT extends AbstractDomainIntegrationTest {

    @Autowired
    private EntityManager entityManager;

    @Test
    @Transactional
    void persistsPhotoGraphWithAttributionModerationAndAudit() {
        User admin = admin();
        User uploader = activeUser();
        var year = academicYear();
        var category = category();
        var event = event(year, category, admin);
        var album = album(event, admin);
        var submission = submission(uploader, event, album);
        var photo = approvedPhoto(uploader, event, album, admin);
        photo.setSubmission(submission);
        photo.setTitle("Convocation 2025");
        photo.setAltText("Graduates gathered on the college lawn");
        photos.saveAndFlush(photo);

        ContributorProfile contributor = new ContributorProfile();
        contributor.setDisplayName("Photographer " + uniqueSuffix());
        contributor.setSlug("photographer-" + uniqueSuffix());
        contributor.setPublished(true);
        contributor.setCreatedBy(admin);
        contributors.saveAndFlush(contributor);

        PhotoPhotographer credit = new PhotoPhotographer();
        credit.setPhoto(photo);
        credit.setContributorProfile(contributor);
        credit.setCreditName(contributor.getDisplayName());
        credit.setCreditOrder((short) 0);
        photographers.saveAndFlush(credit);

        PhotoModeration moderation = new PhotoModeration();
        moderation.setPhoto(photo);
        moderation.setActor(admin);
        moderation.setActorRole(Role.ADMIN);
        moderation.setActorDisplayName(admin.getDisplayName());
        moderation.setAction(ModerationAction.APPROVE);
        moderation.setFromStatus(PhotoStatus.PENDING);
        moderation.setToStatus(PhotoStatus.APPROVED);
        moderation.setReason("Meets archive guidelines");
        moderations.saveAndFlush(moderation);

        AuditLog auditLog = new AuditLog();
        auditLog.setActor(admin);
        auditLog.setActorRole(Role.ADMIN);
        auditLog.setActorDisplayName(admin.getDisplayName());
        auditLog.setAction("PHOTO_APPROVED");
        auditLog.setEntityType("PHOTO");
        auditLog.setEntityId(photo.getId());
        auditLog.setBeforeState(Map.of("status", "PENDING"));
        auditLog.setAfterState(Map.of("status", "APPROVED"));
        auditLogs.saveAndFlush(auditLog);

        entityManager.flush();
        entityManager.clear();

        var reloaded = photos.findById(photo.getId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(PhotoStatus.APPROVED);
        assertThat(reloaded.getAlbum().getId()).isEqualTo(album.getId());
        assertThat(reloaded.getSubmission().getId()).isEqualTo(submission.getId());
        assertThat(reloaded.getApprovedBy().getId()).isEqualTo(admin.getId());
        assertThat(reloaded.getCreatedAt()).isNotNull();
        assertThat(reloaded.getUpdatedAt()).isNotNull();
        assertThat(reloaded.getVersion()).isPositive();

        assertThat(photographers.findByPhoto_IdOrderByCreditOrderAsc(photo.getId()))
                .singleElement()
                .satisfies(savedCredit -> {
                    assertThat(savedCredit.getCreditName()).isEqualTo(contributor.getDisplayName());
                    assertThat(savedCredit.getContributorProfile().getId()).isEqualTo(contributor.getId());
                });

        assertThat(moderations.findByPhoto_IdOrderByCreatedAtDesc(photo.getId()))
                .singleElement()
                .satisfies(savedModeration -> {
                    assertThat(savedModeration.getAction()).isEqualTo(ModerationAction.APPROVE);
                    assertThat(savedModeration.getToStatus()).isEqualTo(PhotoStatus.APPROVED);
                });

        AuditLog reloadedAudit = auditLogs.findById(auditLog.getId()).orElseThrow();
        assertThat(reloadedAudit.getBeforeState()).containsEntry("status", "PENDING");
        assertThat(reloadedAudit.getAfterState()).containsEntry("status", "APPROVED");

        assertThat(photos.findPublicByAlbumId(album.getId(), PageRequest.of(0, 24)).getTotalElements())
                .isEqualTo(1);
    }

    @Test
    @Transactional
    void optimisticLockingIncrementsVersionOnUpdate() {
        User user = activeUser();
        assertThat(user.getVersion()).isZero();

        user.setDisplayName("Updated " + uniqueSuffix());
        users.saveAndFlush(user);
        entityManager.flush();

        assertThat(user.getVersion()).isPositive();
        assertThat(user.getUpdatedAt()).isAfterOrEqualTo(user.getCreatedAt());
    }

    @Test
    @Transactional
    void storesDistinctUtcTimestamps() {
        User user = activeUser();

        assertThat(user.getCreatedAt())
                .isBetween(Instant.now().minusSeconds(60), Instant.now());
        assertThat(user.getUpdatedAt()).isAfterOrEqualTo(user.getCreatedAt());
        assertThat(user.getLastLoginAt()).isNull();
        assertThat(user.getEmailVerifiedAt()).isBeforeOrEqualTo(Instant.now());
    }
}
