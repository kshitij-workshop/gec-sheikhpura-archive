package com.gecarchive.archive;

import java.time.Instant;

import com.gecarchive.album.entity.Album;
import com.gecarchive.event.entity.Event;
import com.gecarchive.photo.entity.Photo;
import com.gecarchive.photo.entity.PhotoPhotographer;
import com.gecarchive.photo.entity.PhotoStatus;
import com.gecarchive.support.AbstractDomainIntegrationTest;
import com.gecarchive.user.entity.User;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class RecentPhotosIT extends AbstractDomainIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void guestsSeeOnlyPublishedPhotosNewestFirstWithAlbumContext() throws Exception {
        var admin = admin();
        var uploader = activeUser();
        var year = academicYear();
        var category = category();
        var event = event(year, category, admin);
        var album = album(event, admin);

        Photo older = approvedPhotoAt(uploader, event, album, admin, Instant.parse("2099-01-01T10:00:00Z"));
        Photo newer = approvedPhotoAt(uploader, event, album, admin, Instant.parse("2099-02-01T10:00:00Z"));
        Photo pending = photo(uploader, event, album, PhotoStatus.PENDING);

        var draftAlbum = album(event, admin, false);
        Photo draftAlbumPhoto = approvedPhotoAt(uploader, event, draftAlbum, admin,
                Instant.parse("2099-03-01T10:00:00Z"));

        var draftEvent = event(year, category, admin, false);
        var draftEventAlbum = album(draftEvent, admin);
        Photo draftEventPhoto = approvedPhotoAt(uploader, draftEvent, draftEventAlbum, admin,
                Instant.parse("2099-04-01T10:00:00Z"));

        credit(newer, "Asha Verma");

        mockMvc.perform(get("/api/v1/photos").param("size", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value(newer.getId().toString()))
                .andExpect(jsonPath("$.items[1].id").value(older.getId().toString()))
                .andExpect(jsonPath("$.items[0].albumId").value(album.getId().toString()))
                .andExpect(jsonPath("$.items[0].albumTitle").value(album.getTitle()))
                .andExpect(jsonPath("$.items[0].albumSlug").value(album.getSlug()))
                .andExpect(jsonPath("$.items[0].eventId").value(event.getId().toString()))
                .andExpect(jsonPath("$.items[0].eventTitle").value(event.getTitle()))
                .andExpect(jsonPath("$.items[0].eventSlug").value(event.getSlug()))
                .andExpect(jsonPath("$.items[0].photographers[0].creditName").value("Asha Verma"))
                .andExpect(jsonPath("$.items[*].id", not(hasItem(pending.getId().toString()))))
                .andExpect(jsonPath("$.items[*].id", not(hasItem(draftAlbumPhoto.getId().toString()))))
                .andExpect(jsonPath("$.items[*].id", not(hasItem(draftEventPhoto.getId().toString()))));
    }

    @Test
    void recentPhotoPaginationIsBounded() throws Exception {
        mockMvc.perform(get("/api/v1/photos")
                        .param("page", "-4")
                        .param("size", "1000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(100));
    }

    private Photo approvedPhotoAt(
            User uploader,
            Event event,
            Album album,
            User approver,
            Instant approvedAt) {
        return photo(uploader, event, album, PhotoStatus.APPROVED, approver, approvedAt);
    }

    private void credit(Photo photo, String name) {
        PhotoPhotographer credit = new PhotoPhotographer();
        credit.setPhoto(photo);
        credit.setCreditName(name);
        credit.setCreditOrder((short) 0);
        photographers.saveAndFlush(credit);
    }
}
