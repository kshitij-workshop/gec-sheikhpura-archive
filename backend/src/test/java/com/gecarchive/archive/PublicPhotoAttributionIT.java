package com.gecarchive.archive;

import com.gecarchive.archive.dto.PublicPhotoResponse;
import com.gecarchive.archive.service.PublicArchiveService;
import com.gecarchive.photo.entity.Photo;
import com.gecarchive.photo.entity.PhotoPhotographer;
import com.gecarchive.support.AbstractDomainIntegrationTest;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

class PublicPhotoAttributionIT extends AbstractDomainIntegrationTest {

    @Autowired
    private PublicArchiveService archive;

    @Test
    void albumPhotosCarryOrderedPhotographerCredits() {
        var admin = admin();
        var uploader = activeUser();
        var year = academicYear();
        var category = category();
        var event = event(year, category, admin);
        var album = album(event, admin);
        var photo = approvedPhoto(uploader, event, album, admin);

        credit(photo, "Asha Verma", (short) 1);
        credit(photo, "Ravi Kumar", (short) 0);

        var detail = archive.album(album.getId(), 0, 24);

        assertThat(detail.photos().items()).hasSize(1);
        assertThat(detail.photos().items().getFirst().photographers())
                .extracting(credit -> credit.creditName())
                .containsExactly("Ravi Kumar", "Asha Verma");
    }

    @Test
    void singlePublicPhotoCarriesItsCredits() {
        var admin = admin();
        var uploader = activeUser();
        var year = academicYear();
        var category = category();
        var event = event(year, category, admin);
        var album = album(event, admin);
        var photo = approvedPhoto(uploader, event, album, admin);
        credit(photo, "Archive Studio", (short) 0);

        PublicPhotoResponse response = archive.photo(photo.getId());

        assertThat(response.photographers())
                .extracting(credit -> credit.creditName())
                .containsExactly("Archive Studio");
        assertThat(response.photographers().getFirst().creditOrder()).isZero();
    }

    private void credit(Photo photo, String name, short order) {
        PhotoPhotographer credit = new PhotoPhotographer();
        credit.setPhoto(photo);
        credit.setCreditName(name);
        credit.setCreditOrder(order);
        photographers.saveAndFlush(credit);
    }
}
