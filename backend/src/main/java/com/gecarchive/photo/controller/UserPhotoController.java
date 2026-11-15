package com.gecarchive.photo.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import com.gecarchive.common.dto.PageResponse;
import com.gecarchive.common.security.AuthenticatedUser;
import com.gecarchive.photo.dto.UserPhotoResponse;
import com.gecarchive.photo.entity.Photo;
import com.gecarchive.photo.entity.PhotoPhotographer;
import com.gecarchive.photo.repository.PhotoPhotographerRepository;
import com.gecarchive.photo.repository.PhotoRepository;

import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me/photos")
public class UserPhotoController {

    private static final int MAX_PAGE_SIZE = 100;

    private final PhotoRepository photos;
    private final PhotoPhotographerRepository photographers;

    public UserPhotoController(PhotoRepository photos, PhotoPhotographerRepository photographers) {
        this.photos = photos;
        this.photographers = photographers;
    }

    @Transactional(readOnly = true)
    @GetMapping
    public PageResponse<UserPhotoResponse> mine(
            @AuthenticationPrincipal AuthenticatedUser actor,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size) {
        var result = photos.findByUploadedBy_IdOrderByCreatedAtDesc(actor.id(),
                PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), MAX_PAGE_SIZE)));

        // One credited-name query per page instead of one per photograph.
        List<UUID> photoIds = result.getContent().stream().map(Photo::getId).toList();
        Map<UUID, List<PhotoPhotographer>> creditsByPhoto = photoIds.isEmpty()
                ? Map.of()
                : photographers.findByPhoto_IdInOrderByPhoto_IdAscCreditOrderAsc(photoIds).stream()
                        .collect(Collectors.groupingBy(credit -> credit.getPhoto().getId()));

        return PageResponse.from(result, photo -> UserPhotoResponse.from(photo,
                creditsByPhoto.getOrDefault(photo.getId(), List.of())));
    }
}
