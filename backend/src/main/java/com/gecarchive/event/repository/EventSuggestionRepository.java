package com.gecarchive.event.repository;

import java.util.List;
import java.util.UUID;

import com.gecarchive.event.entity.EventSuggestion;
import com.gecarchive.event.entity.SuggestionStatus;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface EventSuggestionRepository extends JpaRepository<EventSuggestion, UUID> {

    Page<EventSuggestion> findByStatusOrderByCreatedAtAsc(SuggestionStatus status, Pageable pageable);

    Page<EventSuggestion> findAllByOrderByCreatedAtAsc(Pageable pageable);

    @EntityGraph(attributePaths = {"category", "academicYear"})
    Page<EventSuggestion> findBySuggestedBy_IdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    @Query("select suggestion.status, count(suggestion) from EventSuggestion suggestion group by suggestion.status")
    List<Object[]> countGroupedByStatus();
}
