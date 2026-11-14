package com.gecarchive.moderation.entity;

import java.time.Instant;

import com.gecarchive.common.persistence.VersionedEntity;
import com.gecarchive.photo.entity.Photo;
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
@Table(name = "photo_reports")
public class PhotoReport extends VersionedEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "photo_id", nullable = false)
    private Photo photo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reported_by_user_id", nullable = false)
    private User reportedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 30)
    private ReportCategory category;

    @Column(name = "details", length = 1000)
    private String details;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ReportStatus status = ReportStatus.PENDING;

    @Column(name = "resolution_note", length = 1000)
    private String resolutionNote;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "handled_by_user_id")
    private User handledBy;

    @Column(name = "handled_at")
    private Instant handledAt;

    public Photo getPhoto() {
        return photo;
    }

    public void setPhoto(Photo photo) {
        this.photo = photo;
    }

    public User getReportedBy() {
        return reportedBy;
    }

    public void setReportedBy(User reportedBy) {
        this.reportedBy = reportedBy;
    }

    public ReportCategory getCategory() {
        return category;
    }

    public void setCategory(ReportCategory category) {
        this.category = category;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    public ReportStatus getStatus() {
        return status;
    }

    public void setStatus(ReportStatus status) {
        this.status = status;
    }

    public String getResolutionNote() {
        return resolutionNote;
    }

    public void setResolutionNote(String resolutionNote) {
        this.resolutionNote = resolutionNote;
    }

    public User getHandledBy() {
        return handledBy;
    }

    public void setHandledBy(User handledBy) {
        this.handledBy = handledBy;
    }

    public Instant getHandledAt() {
        return handledAt;
    }

    public void setHandledAt(Instant handledAt) {
        this.handledAt = handledAt;
    }
}
