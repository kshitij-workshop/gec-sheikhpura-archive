package com.gecarchive.event.entity;

import com.gecarchive.common.persistence.AuditableEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "categories")
public class Category extends AuditableEntity {

    @Column(name = "name", nullable = false, length = 80, unique = true)
    private String name;

    @Column(name = "slug", nullable = false, length = 80, unique = true)
    private String slug;

    @Column(name = "description")
    private String description;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
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

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
