package com.gecarchive.upload.dto;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PhotographerCreditRequest(
        UUID contributorProfileId,
        @NotBlank @Size(max = 120) String creditName) {
}
