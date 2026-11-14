package com.gecarchive.photo.entity;

import com.gecarchive.common.persistence.CreatedEntity;
import com.gecarchive.contributor.entity.ContributorProfile;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "photo_photographers")
public class PhotoPhotographer extends CreatedEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "photo_id", nullable = false)
    private Photo photo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contributor_profile_id")
    private ContributorProfile contributorProfile;

    @Column(name = "credit_name", nullable = false, length = 120)
    private String creditName;

    @Column(name = "credit_order", nullable = false)
    private short creditOrder;

    public Photo getPhoto() {
        return photo;
    }

    public void setPhoto(Photo photo) {
        this.photo = photo;
    }

    public ContributorProfile getContributorProfile() {
        return contributorProfile;
    }

    public void setContributorProfile(ContributorProfile contributorProfile) {
        this.contributorProfile = contributorProfile;
    }

    public String getCreditName() {
        return creditName;
    }

    public void setCreditName(String creditName) {
        this.creditName = creditName;
    }

    public short getCreditOrder() {
        return creditOrder;
    }

    public void setCreditOrder(short creditOrder) {
        this.creditOrder = creditOrder;
    }
}
