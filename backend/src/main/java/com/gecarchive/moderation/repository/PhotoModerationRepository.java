package com.gecarchive.moderation.repository;

import java.util.List;
import java.util.UUID;

import com.gecarchive.moderation.entity.PhotoModeration;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PhotoModerationRepository extends JpaRepository<PhotoModeration, UUID> {

    List<PhotoModeration> findByPhoto_IdOrderByCreatedAtDesc(UUID photoId);
}
