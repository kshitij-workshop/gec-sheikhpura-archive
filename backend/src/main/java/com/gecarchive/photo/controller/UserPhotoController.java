package com.gecarchive.photo.controller;

import com.gecarchive.common.dto.PageResponse;
import com.gecarchive.common.security.AuthenticatedUser;
import com.gecarchive.photo.dto.UserPhotoResponse;
import com.gecarchive.photo.repository.PhotoRepository;

import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me/photos")
public class UserPhotoController {

    private static final int MAX_PAGE_SIZE = 100;

    private final PhotoRepository photos;

    public UserPhotoController(PhotoRepository photos) {
        this.photos = photos;
    }

    @GetMapping
    public PageResponse<UserPhotoResponse> mine(
            @AuthenticationPrincipal AuthenticatedUser actor,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size) {
        var result = photos.findByUploadedBy_IdOrderByCreatedAtDesc(actor.id(),
                PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), MAX_PAGE_SIZE)));
        return PageResponse.from(result, UserPhotoResponse::from);
    }
}
