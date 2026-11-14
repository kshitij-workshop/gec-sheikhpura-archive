package com.gecarchive.event.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.gecarchive.event.entity.Category;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, UUID> {

    Optional<Category> findBySlug(String slug);

    List<Category> findByActiveTrueOrderBySortOrderAscNameAsc();
}
