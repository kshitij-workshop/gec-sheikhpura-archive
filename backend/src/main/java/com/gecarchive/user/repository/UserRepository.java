package com.gecarchive.user.repository;

import java.util.Optional;
import java.util.UUID;

import com.gecarchive.user.entity.Role;
import com.gecarchive.user.entity.User;
import com.gecarchive.user.entity.UserStatus;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmailIgnoreCase(String email);

    Optional<User> findByGoogleSubject(String googleSubject);

    boolean existsByEmailIgnoreCase(String email);

    long countByEmailIgnoreCase(String email);

    boolean existsByRoleAndStatus(Role role, UserStatus status);

    long countByStatus(UserStatus status);

    long countByRoleAndStatus(Role role, UserStatus status);

    long countByRoleAndStatusAndIdNot(Role role, UserStatus status, UUID id);

    Page<User> findByEmailContainingIgnoreCaseOrDisplayNameContainingIgnoreCase(
            String email, String displayName, Pageable pageable);

    Page<User> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("select user.status, count(user) from User user group by user.status")
    java.util.List<Object[]> countGroupedByStatus();

    @Query("select user.role, count(user) from User user group by user.role")
    java.util.List<Object[]> countGroupedByRole();
}
