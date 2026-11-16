package com.gecarchive.analytics.entity;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

/** Composite key for an anonymous visit on a UTC calendar day. */
public class VisitorDayId implements Serializable {

    private UUID visitorId;
    private LocalDate visitDate;

    protected VisitorDayId() {
    }

    public VisitorDayId(UUID visitorId, LocalDate visitDate) {
        this.visitorId = visitorId;
        this.visitDate = visitDate;
    }

    public UUID getVisitorId() {
        return visitorId;
    }

    public LocalDate getVisitDate() {
        return visitDate;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof VisitorDayId candidate)) {
            return false;
        }
        return Objects.equals(visitorId, candidate.visitorId)
                && Objects.equals(visitDate, candidate.visitDate);
    }

    @Override
    public int hashCode() {
        return Objects.hash(visitorId, visitDate);
    }
}
