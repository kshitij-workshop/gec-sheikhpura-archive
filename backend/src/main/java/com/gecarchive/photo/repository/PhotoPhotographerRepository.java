package com.gecarchive.photo.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import com.gecarchive.photo.entity.PhotoPhotographer;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PhotoPhotographerRepository extends JpaRepository<PhotoPhotographer, UUID> {

    List<PhotoPhotographer> findByPhoto_IdOrderByCreditOrderAsc(UUID photoId);

    List<PhotoPhotographer> findByPhoto_IdInOrderByPhoto_IdAscCreditOrderAsc(Collection<UUID> photoIds);
}
