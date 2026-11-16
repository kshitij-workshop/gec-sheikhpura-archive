package com.gecarchive.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * @param idToken the ID token produced by Google Identity Services in the
 *                browser. It is verified server-side and never stored.
 */
public record GoogleSignInRequest(
        @NotBlank @Size(max = 4096) String idToken) {
}
