package com.gecarchive.user.repository;

import java.util.Optional;
import java.util.UUID;

import com.gecarchive.user.entity.Role;
import com.gecarchive.user.entity.User;
import com.gecarchive.user.entity.UserStatus;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    long countByEmailIgnoreCase(String email);

    boolean existsByRoleAndStatus(Role role, UserStatus status);

    long countByRoleAndStatus(Role role, UserStatus status);

    long countByRoleAndStatusAndIdNot(Role role, UserStatus status, UUID id);

    Page<User> findByEmailContainingIgnoreCaseOrDisplayNameContainingIgnoreCase(
            String email, String displayName, Pageable pageable);

    Page<User> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
