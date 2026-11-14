package com.gecarchive.photo.entity;

import com.gecarchive.album.entity.Album;
import com.gecarchive.common.persistence.VersionedEntity;
import com.gecarchive.event.entity.Event;
import com.gecarchive.user.entity.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "photo_submissions")
public class PhotoSubmission extends VersionedEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "submitted_by_user_id", nullable = false)
    private User submittedBy;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "album_id")
    private Album album;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private SubmissionStatus status = SubmissionStatus.PENDING;

    @Column(name = "note")
    private String note;

    public User getSubmittedBy() {
        return submittedBy;
    }

    public void setSubmittedBy(User submittedBy) {
        this.submittedBy = submittedBy;
    }

    public Event getEvent() {
        return event;
    }

    public void setEvent(Event event) {
        this.event = event;
    }

    public Album getAlbum() {
        return album;
    }

    public void setAlbum(Album album) {
        this.album = album;
    }

    public SubmissionStatus getStatus() {
        return status;
    }

    public void setStatus(SubmissionStatus status) {
        this.status = status;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }
}
