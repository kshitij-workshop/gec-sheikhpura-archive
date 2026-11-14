package com.gecarchive.audit.dto;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import com.gecarchive.audit.entity.AuditLog;

public record AuditLogResponse(
        UUID id,
        UUID actorUserId,
        String actorRole,
        String actorDisplayName,
        String action,
        String entityType,
        UUID entityId,
        Map<String, Object> beforeState,
        Map<String, Object> afterState,
        String ipAddress,
        String userAgent,
        Instant createdAt) {

    public static AuditLogResponse from(AuditLog log) {
        return new AuditLogResponse(
                log.getId(),
                log.getActor() == null ? null : log.getActor().getId(),
                log.getActorRole() == null ? null : log.getActorRole().name(),
                log.getActorDisplayName(),
                log.getAction(),
                log.getEntityType(),
                log.getEntityId(),
                log.getBeforeState(),
                log.getAfterState(),
                log.getIpAddress(),
                log.getUserAgent(),
                log.getCreatedAt());
    }
}
