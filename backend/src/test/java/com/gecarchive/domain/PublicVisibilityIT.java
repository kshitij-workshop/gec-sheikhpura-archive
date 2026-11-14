package com.gecarchive.domain;

import com.gecarchive.support.AbstractDomainIntegrationTest;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;

import static org.assertj.core.api.Assertions.assertThat;

class PublicVisibilityIT extends AbstractDomainIntegrationTest {

    @Test
    void publicAlbumQueryReturnsOnlyApprovedVisiblePhotos() {
        var admin = admin();
        var uploader = activeUser();
        var year = academicYear();
        var category = category();
        var publishedEvent = event(year, category, admin);
        var publishedAlbum = album(publishedEvent, admin);

        var approved = approvedPhoto(uploader, publishedEvent, publishedAlbum, admin);
        var pending = photo(
                uploader, publishedEvent, publishedAlbum, com.gecarchive.photo.entity.PhotoStatus.PENDING);
        photo(uploader, publishedEvent, publishedAlbum, com.gecarchive.photo.entity.PhotoStatus.REJECTED);
        photo(uploader, publishedEvent, publishedAlbum, com.gecarchive.photo.entity.PhotoStatus.HIDDEN);

        var deleted = approvedPhoto(uploader, publishedEvent, publishedAlbum, admin);
        deleted.setDeletedAt(java.time.Instant.now());
        photos.saveAndFlush(deleted);

        var result = photos.findPublicByAlbumId(publishedAlbum.getId(), PageRequest.of(0, 24));

        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent())
                .extracting(photo -> photo.getId())
                .containsExactly(approved.getId());

        assertThat(photos.findPublicById(approved.getId())).isPresent();
        assertThat(photos.findPublicById(pending.getId())).isEmpty();
        assertThat(photos.findPublicById(deleted.getId())).isEmpty();

        var eventResult = photos.findPublicByEventId(publishedEvent.getId(), PageRequest.of(0, 24));
        assertThat(eventResult.getContent())
                .extracting(photo -> photo.getId())
                .containsExactly(approved.getId())
                .doesNotContain(pending.getId());
    }

    @Test
    void publicAlbumQueryExcludesUnpublishedAlbumAndEvent() {
        var admin = admin();
        var uploader = activeUser();
        var year = academicYear();
        var category = category();

        var publishedEvent = event(year, category, admin);
        var unpublishedAlbum = album(publishedEvent, admin, false);
        var photoInUnpublishedAlbum = approvedPhoto(uploader, publishedEvent, unpublishedAlbum, admin);

        var unpublishedEvent = event(year, category, admin, false);
        var albumOfUnpublishedEvent = album(unpublishedEvent, admin, true);
        var photoInUnpublishedEvent = approvedPhoto(
                uploader, unpublishedEvent, albumOfUnpublishedEvent, admin);

        assertThat(photos.findPublicByAlbumId(unpublishedAlbum.getId(), PageRequest.of(0, 24)))
                .isEmpty();
        assertThat(photos.findPublicByAlbumId(albumOfUnpublishedEvent.getId(), PageRequest.of(0, 24)))
                .isEmpty();
        assertThat(photos.findPublicByEventId(unpublishedEvent.getId(), PageRequest.of(0, 24)))
                .isEmpty();
        assertThat(photos.findPublicById(photoInUnpublishedAlbum.getId())).isEmpty();
        assertThat(photos.findPublicById(photoInUnpublishedEvent.getId())).isEmpty();
    }

    @Test
    void publicEventListingExcludesDeletedAndUnpublishedEvents() {
        var admin = admin();
        var year = academicYear();
        var category = category();

        var published = event(year, category, admin);
        var unpublished = event(year, category, admin, false);
        var deleted = event(year, category, admin);
        deleted.setDeletedAt(java.time.Instant.now());
        events.saveAndFlush(deleted);

        var result = events.findByPublishedTrueAndDeletedAtIsNull(PageRequest.of(0, 24));

        assertThat(result.getContent())
                .extracting(event -> event.getId())
                .contains(published.getId())
                .doesNotContain(unpublished.getId(), deleted.getId());
    }
}
