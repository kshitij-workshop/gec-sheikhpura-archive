package com.gecarchive.user.controller;

import java.util.UUID;

import com.gecarchive.auth.service.UserAccountService;
import com.gecarchive.common.dto.PageResponse;
import com.gecarchive.common.security.AuthenticatedUser;
import com.gecarchive.common.security.ClientInfo;
import com.gecarchive.user.dto.UpdateRoleRequest;
import com.gecarchive.user.dto.UpdateStatusRequest;
import com.gecarchive.user.dto.UserResponse;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/users")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class AdminUserController {

    private final UserAccountService userAccountService;

    public AdminUserController(UserAccountService userAccountService) {
        this.userAccountService = userAccountService;
    }

    @GetMapping
    public PageResponse<UserResponse> list(
            @RequestParam(defaultValue = "") String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size) {
        return PageResponse.from(userAccountService.listUsers(query, page, size));
    }

    @PatchMapping("/{id}/role")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public UserResponse changeRole(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateRoleRequest request,
            HttpServletRequest httpRequest) {
        return userAccountService.changeRole(
                principal, id, request.role(), ClientInfo.from(httpRequest));
    }

    @PatchMapping("/{id}/status")
    public UserResponse changeStatus(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateStatusRequest request,
            HttpServletRequest httpRequest) {
        return userAccountService.changeStatus(
                principal, id, request.status(), ClientInfo.from(httpRequest));
    }
}
