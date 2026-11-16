package com.gecarchive.analytics.repository;

import java.time.LocalDate;
import java.util.UUID;

import com.gecarchive.analytics.entity.VisitorDay;
import com.gecarchive.analytics.entity.VisitorDayId;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VisitorDayRepository extends JpaRepository<VisitorDay, VisitorDayId> {

    /**
     * Idempotent insert: repeat visits from the same browser on the same UTC day
     * refresh {@code last_seen_at} instead of adding a second row.
     */
    @Modifying
    @Query(value = """
            INSERT INTO visitor_days (visitor_id, visit_date)
            VALUES (:visitorId, :visitDate)
            ON CONFLICT (visitor_id, visit_date) DO UPDATE SET last_seen_at = now()
            """, nativeQuery = true)
    int recordVisit(@Param("visitorId") UUID visitorId, @Param("visitDate") LocalDate visitDate);

    long countByVisitDate(LocalDate visitDate);

    @Query("select count(distinct visit.visitorId) from VisitorDay visit")
    long countDistinctVisitors();
}
