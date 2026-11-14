package com.gecarchive.album.entity;

import java.time.Instant;

import com.gecarchive.common.persistence.VersionedEntity;
import com.gecarchive.event.entity.Event;
import com.gecarchive.user.entity.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "albums")
public class Album extends VersionedEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by_user_id", nullable = false)
    private User createdBy;

    @Column(name = "title", nullable = false, length = 160)
    private String title;

    @Column(name = "slug", nullable = false, length = 180, unique = true)
    private String slug;

    @Column(name = "description")
    private String description;

    @Column(name = "published", nullable = false)
    private boolean published;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    public Event getEvent() {
        return event;
    }

    public void setEvent(Event event) {
        this.event = event;
    }

    public User getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(User createdBy) {
        this.createdBy = createdBy;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public boolean isPublished() {
        return published;
    }

    public void setPublished(boolean published) {
        this.published = published;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(Instant deletedAt) {
        this.deletedAt = deletedAt;
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }
}
