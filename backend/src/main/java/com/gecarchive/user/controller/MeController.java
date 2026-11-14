package com.gecarchive.user.controller;

import com.gecarchive.auth.dto.ChangePasswordRequest;
import com.gecarchive.auth.service.PasswordResetService;
import com.gecarchive.auth.service.UserAccountService;
import com.gecarchive.auth.web.RefreshCookieFactory;
import com.gecarchive.common.security.AuthenticatedUser;
import com.gecarchive.common.security.ClientInfo;
import com.gecarchive.user.dto.UpdateProfileRequest;
import com.gecarchive.user.dto.UserResponse;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1/me")
public class MeController {

    private final UserAccountService userAccountService;
    private final PasswordResetService passwordResetService;
    private final RefreshCookieFactory cookieFactory;

    public MeController(
            UserAccountService userAccountService,
            PasswordResetService passwordResetService,
            RefreshCookieFactory cookieFactory) {
        this.userAccountService = userAccountService;
        this.passwordResetService = passwordResetService;
        this.cookieFactory = cookieFactory;
    }

    @GetMapping
    public UserResponse me(@AuthenticationPrincipal AuthenticatedUser principal) {
        return userAccountService.currentUser(principal);
    }

    @PatchMapping
    public UserResponse updateProfile(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody UpdateProfileRequest request) {
        return userAccountService.updateProfile(principal, request);
    }

    @PatchMapping("/password")
    public ResponseEntity<Void> changePassword(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody ChangePasswordRequest request,
            HttpServletRequest httpRequest) {
        passwordResetService.changePassword(principal, request, ClientInfo.from(httpRequest));
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cookieFactory.clear().toString())
                .build();
    }
}
