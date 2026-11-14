package com.gecarchive.photo.entity;

import java.time.Instant;

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
@Table(name = "photos")
public class Photo extends VersionedEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submission_id")
    private PhotoSubmission submission;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "album_id")
    private Album album;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "uploaded_by_user_id", nullable = false)
    private User uploadedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by_user_id")
    private User approvedBy;

    @Column(name = "title", length = 160)
    private String title;

    @Column(name = "caption")
    private String caption;

    @Column(name = "alt_text", length = 300)
    private String altText;

    @Column(name = "cloudinary_public_id", nullable = false, length = 255, unique = true)
    private String cloudinaryPublicId;

    @Column(name = "cloudinary_asset_id", nullable = false, length = 255, unique = true)
    private String cloudinaryAssetId;

    @Column(name = "format", nullable = false, length = 10)
    private String format;

    @Column(name = "width_px", nullable = false)
    private int widthPx;

    @Column(name = "height_px", nullable = false)
    private int heightPx;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(name = "taken_at")
    private Instant takenAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private PhotoStatus status = PhotoStatus.PENDING;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    public PhotoSubmission getSubmission() {
        return submission;
    }

    public void setSubmission(PhotoSubmission submission) {
        this.submission = submission;
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

    public User getUploadedBy() {
        return uploadedBy;
    }

    public void setUploadedBy(User uploadedBy) {
        this.uploadedBy = uploadedBy;
    }

    public User getApprovedBy() {
        return approvedBy;
    }

    public void setApprovedBy(User approvedBy) {
        this.approvedBy = approvedBy;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getCaption() {
        return caption;
    }

    public void setCaption(String caption) {
        this.caption = caption;
    }

    public String getAltText() {
        return altText;
    }

    public void setAltText(String altText) {
        this.altText = altText;
    }

    public String getCloudinaryPublicId() {
        return cloudinaryPublicId;
    }

    public void setCloudinaryPublicId(String cloudinaryPublicId) {
        this.cloudinaryPublicId = cloudinaryPublicId;
    }

    public String getCloudinaryAssetId() {
        return cloudinaryAssetId;
    }

    public void setCloudinaryAssetId(String cloudinaryAssetId) {
        this.cloudinaryAssetId = cloudinaryAssetId;
    }

    public String getFormat() {
        return format;
    }

    public void setFormat(String format) {
        this.format = format;
    }

    public int getWidthPx() {
        return widthPx;
    }

    public void setWidthPx(int widthPx) {
        this.widthPx = widthPx;
    }

    public int getHeightPx() {
        return heightPx;
    }

    public void setHeightPx(int heightPx) {
        this.heightPx = heightPx;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public void setSizeBytes(long sizeBytes) {
        this.sizeBytes = sizeBytes;
    }

    public Instant getTakenAt() {
        return takenAt;
    }

    public void setTakenAt(Instant takenAt) {
        this.takenAt = takenAt;
    }

    public PhotoStatus getStatus() {
        return status;
    }

    public void setStatus(PhotoStatus status) {
        this.status = status;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public Instant getApprovedAt() {
        return approvedAt;
    }

    public void setApprovedAt(Instant approvedAt) {
        this.approvedAt = approvedAt;
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
