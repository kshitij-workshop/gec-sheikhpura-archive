package com.gecarchive.archive.dto;

import java.util.UUID;

import com.gecarchive.event.entity.Category;

public record CategoryResponse(
        UUID id, String name, String slug, String description, int sortOrder, boolean active) {

    public static CategoryResponse from(Category category) {
        return new CategoryResponse(category.getId(), category.getName(), category.getSlug(),
                category.getDescription(), category.getSortOrder(), category.isActive());
    }
}
