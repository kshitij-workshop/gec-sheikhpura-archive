package com.gecarchive.event.repository;

import java.util.UUID;

import com.gecarchive.event.entity.EventSuggestion;
import com.gecarchive.event.entity.SuggestionStatus;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventSuggestionRepository extends JpaRepository<EventSuggestion, UUID> {

    Page<EventSuggestion> findByStatusOrderByCreatedAtAsc(SuggestionStatus status, Pageable pageable);

    Page<EventSuggestion> findBySuggestedBy_IdOrderByCreatedAtDesc(UUID userId, Pageable pageable);
}
