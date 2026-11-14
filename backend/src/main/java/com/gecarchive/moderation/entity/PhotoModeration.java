package com.gecarchive.moderation.entity;

import com.gecarchive.common.persistence.CreatedEntity;
import com.gecarchive.photo.entity.Photo;
import com.gecarchive.photo.entity.PhotoStatus;
import com.gecarchive.user.entity.Role;
import com.gecarchive.user.entity.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "photo_moderations")
public class PhotoModeration extends CreatedEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "photo_id", nullable = false)
    private Photo photo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "actor_user_id", nullable = false)
    private User actor;

    @Enumerated(EnumType.STRING)
    @Column(name = "actor_role", nullable = false, length = 20)
    private Role actorRole;

    @Column(name = "actor_display_name", nullable = false, length = 120)
    private String actorDisplayName;

    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false, length = 20)
    private ModerationAction action;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", length = 20)
    private PhotoStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false, length = 20)
    private PhotoStatus toStatus;

    @Column(name = "reason", length = 1000)
    private String reason;

    public Photo getPhoto() {
        return photo;
    }

    public void setPhoto(Photo photo) {
        this.photo = photo;
    }

    public User getActor() {
        return actor;
    }

    public void setActor(User actor) {
        this.actor = actor;
    }

    public Role getActorRole() {
        return actorRole;
    }

    public void setActorRole(Role actorRole) {
        this.actorRole = actorRole;
    }

    public String getActorDisplayName() {
        return actorDisplayName;
    }

    public void setActorDisplayName(String actorDisplayName) {
        this.actorDisplayName = actorDisplayName;
    }

    public ModerationAction getAction() {
        return action;
    }

    public void setAction(ModerationAction action) {
        this.action = action;
    }

    public PhotoStatus getFromStatus() {
        return fromStatus;
    }

    public void setFromStatus(PhotoStatus fromStatus) {
        this.fromStatus = fromStatus;
    }

    public PhotoStatus getToStatus() {
        return toStatus;
    }

    public void setToStatus(PhotoStatus toStatus) {
        this.toStatus = toStatus;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
