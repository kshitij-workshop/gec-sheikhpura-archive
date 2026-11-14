package com.gecarchive.upload.entity;

import java.time.Instant;

import com.gecarchive.common.persistence.CreatedEntity;
import com.gecarchive.photo.entity.PhotoSubmission;
import com.gecarchive.user.entity.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "upload_authorizations")
public class UploadAuthorization extends CreatedEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "submission_id", nullable = false)
    private PhotoSubmission submission;

    @Column(name = "public_id", nullable = false, length = 255, unique = true)
    private String publicId;

    @Column(name = "upload_signature", nullable = false, length = 128)
    private String uploadSignature;

    @Column(name = "upload_timestamp", nullable = false)
    private long uploadTimestamp;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "used_at")
    private Instant usedAt;

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public PhotoSubmission getSubmission() { return submission; }
    public void setSubmission(PhotoSubmission submission) { this.submission = submission; }
    public String getPublicId() { return publicId; }
    public void setPublicId(String publicId) { this.publicId = publicId; }
    public String getUploadSignature() { return uploadSignature; }
    public void setUploadSignature(String uploadSignature) { this.uploadSignature = uploadSignature; }
    public long getUploadTimestamp() { return uploadTimestamp; }
    public void setUploadTimestamp(long uploadTimestamp) { this.uploadTimestamp = uploadTimestamp; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
    public Instant getUsedAt() { return usedAt; }
    public void setUsedAt(Instant usedAt) { this.usedAt = usedAt; }

    public boolean isUsable(Instant now) {
        return usedAt == null && expiresAt.isAfter(now);
    }
}
