package com.gecarchive.analytics.entity;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

/**
 * A single anonymous visit: one row per visitor identifier per UTC day.
 *
 * <p>The identifier is a random value created in the browser. It carries no
 * link to a person and is never combined with the IP address or account.</p>
 */
@Entity
@Table(name = "visitor_days")
@IdClass(VisitorDayId.class)
public class VisitorDay {

    @Id
    @Column(name = "visitor_id", nullable = false, updatable = false)
    private UUID visitorId;

    @Id
    @Column(name = "visit_date", nullable = false, updatable = false)
    private LocalDate visitDate;

    @Column(name = "first_seen_at", nullable = false, insertable = false, updatable = false)
    private Instant firstSeenAt;

    @Column(name = "last_seen_at", nullable = false, insertable = false, updatable = false)
    private Instant lastSeenAt;

    public UUID getVisitorId() {
        return visitorId;
    }

    public LocalDate getVisitDate() {
        return visitDate;
    }

    public Instant getFirstSeenAt() {
        return firstSeenAt;
    }

    public Instant getLastSeenAt() {
        return lastSeenAt;
    }
}
