package com.gecarchive.auth.service;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import com.gecarchive.audit.service.AuditService;
import com.gecarchive.common.error.BadRequestException;
import com.gecarchive.common.error.ForbiddenException;
import com.gecarchive.common.error.ResourceNotFoundException;
import com.gecarchive.common.error.UnauthorizedException;
import com.gecarchive.common.security.AuthenticatedUser;
import com.gecarchive.common.security.ClientInfo;
import com.gecarchive.user.dto.UpdateProfileRequest;
import com.gecarchive.user.dto.UserResponse;
import com.gecarchive.user.entity.Role;
import com.gecarchive.user.entity.User;
import com.gecarchive.user.entity.UserStatus;
import com.gecarchive.user.repository.UserRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserAccountService {

    private static final int MAX_PAGE_SIZE = 100;

    private final UserRepository users;
    private final RefreshTokenService refreshTokenService;
    private final AuditService auditService;

    public UserAccountService(
            UserRepository users,
            RefreshTokenService refreshTokenService,
            AuditService auditService) {
        this.users = users;
        this.refreshTokenService = refreshTokenService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public UserResponse currentUser(AuthenticatedUser principal) {
        return UserResponse.from(requireCurrentUser(principal.id()));
    }

    @Transactional
    public UserResponse updateProfile(AuthenticatedUser principal, UpdateProfileRequest request) {
        User user = requireCurrentUser(principal.id());
        user.setDisplayName(request.displayName().trim());
        users.save(user);
        return UserResponse.from(user);
    }

    @Transactional(readOnly = true)
    public Page<UserResponse> listUsers(String query, int page, int size) {
        Pageable pageable = PageRequest.of(
                Math.max(0, page),
                Math.min(Math.max(1, size), MAX_PAGE_SIZE),
                Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<User> result = query == null || query.isBlank()
                ? users.findAllByOrderByCreatedAtDesc(pageable)
                : users.findByEmailContainingIgnoreCaseOrDisplayNameContainingIgnoreCase(
                        query.trim(), query.trim(), pageable);
        return result.map(UserResponse::from);
    }

    @Transactional
    public UserResponse changeRole(
            AuthenticatedUser principal,
            UUID targetUserId,
            Role newRole,
            ClientInfo client) {

        if (principal.role() != Role.SUPER_ADMIN) {
            throw new ForbiddenException("Only a super administrator may change roles.");
        }
        if (newRole == null || newRole == Role.GUEST) {
            throw new BadRequestException("A persisted user must have USER, ADMIN, or SUPER_ADMIN role.");
        }
        if (principal.id().equals(targetUserId)) {
            throw new ForbiddenException("You cannot change your own role.");
        }

        User actor = requireCurrentUser(principal.id());
        User target = requireTarget(targetUserId);

        if (target.getRole() == newRole) {
            return UserResponse.from(target);
        }

        if (target.getRole() == Role.SUPER_ADMIN
                && target.getStatus() == UserStatus.ACTIVE
                && newRole != Role.SUPER_ADMIN
                && users.countByRoleAndStatusAndIdNot(Role.SUPER_ADMIN, UserStatus.ACTIVE, target.getId()) == 0) {
            throw new ForbiddenException("The last active super administrator cannot be demoted.");
        }

        Role previousRole = target.getRole();
        target.setRole(newRole);
        users.save(target);
        refreshTokenService.revokeAllAfterRoleChange(target.getId());

        auditService.record(
                actor,
                "USER_ROLE_CHANGED",
                "USER",
                target.getId(),
                Map.of("role", previousRole.name()),
                Map.of("role", newRole.name()),
                client);

        return UserResponse.from(target);
    }

    @Transactional
    public UserResponse changeStatus(
            AuthenticatedUser principal,
            UUID targetUserId,
            UserStatus newStatus,
            ClientInfo client) {

        if (newStatus == null || newStatus == UserStatus.PENDING_VERIFICATION) {
            throw new BadRequestException("Status must be ACTIVE, SUSPENDED, or DEACTIVATED.");
        }
        if (principal.id().equals(targetUserId)) {
            throw new ForbiddenException("You cannot change your own account status.");
        }

        User actor = requireCurrentUser(principal.id());
        User target = requireTarget(targetUserId);

        if (target.getRole() != Role.USER && actor.getRole() != Role.SUPER_ADMIN) {
            throw new ForbiddenException("Only a super administrator may manage administrator accounts.");
        }
        if (target.getStatus() == newStatus) {
            return UserResponse.from(target);
        }

        if (target.getRole() == Role.SUPER_ADMIN
                && target.getStatus() == UserStatus.ACTIVE
                && newStatus != UserStatus.ACTIVE
                && users.countByRoleAndStatusAndIdNot(Role.SUPER_ADMIN, UserStatus.ACTIVE, target.getId()) == 0) {
            throw new ForbiddenException("The last active super administrator cannot be deactivated.");
        }

        UserStatus previousStatus = target.getStatus();
        target.setStatus(newStatus);
        users.save(target);

        if (newStatus != UserStatus.ACTIVE) {
            refreshTokenService.revokeAllForUser(target.getId(), "ACCOUNT_" + newStatus.name());
        }

        auditService.record(
                actor,
                "USER_STATUS_CHANGED",
                "USER",
                target.getId(),
                Map.of("status", previousStatus.name()),
                Map.of("status", newStatus.name()),
                client);

        return UserResponse.from(target);
    }

    private User requireCurrentUser(UUID id) {
        return users.findById(id).orElseThrow(UnauthorizedException::new);
    }

    private User requireTarget(UUID id) {
        return users.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("The requested user was not found."));
    }
}
