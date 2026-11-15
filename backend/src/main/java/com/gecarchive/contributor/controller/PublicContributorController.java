package com.gecarchive.contributor.controller;

import com.gecarchive.common.dto.PageResponse;
import com.gecarchive.contributor.dto.PublicContributorResponse;
import com.gecarchive.contributor.service.PublicContributorService;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/contributors")
public class PublicContributorController {

    private final PublicContributorService contributors;

    public PublicContributorController(PublicContributorService contributors) {
        this.contributors = contributors;
    }

    @GetMapping
    public PageResponse<PublicContributorResponse> directory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size) {
        return contributors.directory(page, size);
    }
}
