package com.gecarchive.event.entity;

import java.time.Instant;
import java.time.LocalDate;

import com.gecarchive.common.persistence.VersionedEntity;
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
@Table(name = "event_suggestions")
public class EventSuggestion extends VersionedEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "suggested_by_user_id", nullable = false)
    private User suggestedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "academic_year_id")
    private AcademicYear academicYear;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_user_id")
    private User reviewedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_event_id")
    private Event createdEvent;

    @Column(name = "title", nullable = false, length = 160)
    private String title;

    @Column(name = "description")
    private String description;

    @Column(name = "approximate_date")
    private LocalDate approximateDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private SuggestionStatus status = SuggestionStatus.PENDING;

    @Column(name = "review_note", length = 1000)
    private String reviewNote;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    public User getSuggestedBy() {
        return suggestedBy;
    }

    public void setSuggestedBy(User suggestedBy) {
        this.suggestedBy = suggestedBy;
    }

    public Category getCategory() {
        return category;
    }

    public void setCategory(Category category) {
        this.category = category;
    }

    public AcademicYear getAcademicYear() {
        return academicYear;
    }

    public void setAcademicYear(AcademicYear academicYear) {
        this.academicYear = academicYear;
    }

    public User getReviewedBy() {
        return reviewedBy;
    }

    public void setReviewedBy(User reviewedBy) {
        this.reviewedBy = reviewedBy;
    }

    public Event getCreatedEvent() {
        return createdEvent;
    }

    public void setCreatedEvent(Event createdEvent) {
        this.createdEvent = createdEvent;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDate getApproximateDate() {
        return approximateDate;
    }

    public void setApproximateDate(LocalDate approximateDate) {
        this.approximateDate = approximateDate;
    }

    public SuggestionStatus getStatus() {
        return status;
    }

    public void setStatus(SuggestionStatus status) {
        this.status = status;
    }

    public String getReviewNote() {
        return reviewNote;
    }

    public void setReviewNote(String reviewNote) {
        this.reviewNote = reviewNote;
    }

    public Instant getReviewedAt() {
        return reviewedAt;
    }

    public void setReviewedAt(Instant reviewedAt) {
        this.reviewedAt = reviewedAt;
    }
}
