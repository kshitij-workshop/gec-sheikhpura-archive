package com.gecarchive.audit.service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import com.gecarchive.audit.entity.AuditLog;
import com.gecarchive.audit.repository.AuditLogRepository;
import com.gecarchive.common.security.ClientInfo;
import com.gecarchive.user.entity.User;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditService {

    private final AuditLogRepository repository;

    public AuditService(AuditLogRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public void record(
            User actor,
            String action,
            String entityType,
            UUID entityId,
            Map<String, Object> beforeState,
            Map<String, Object> afterState,
            ClientInfo client) {

        AuditLog entry = new AuditLog();
        if (actor != null) {
            entry.setActor(actor);
            entry.setActorRole(actor.getRole());
            entry.setActorDisplayName(actor.getDisplayName());
        }
        entry.setAction(action);
        entry.setEntityType(entityType);
        entry.setEntityId(entityId);
        entry.setBeforeState(beforeState == null ? null : new LinkedHashMap<>(beforeState));
        entry.setAfterState(afterState == null ? null : new LinkedHashMap<>(afterState));
        if (client != null) {
            entry.setIpAddress(client.ipAddress());
            entry.setUserAgent(client.userAgent());
        }
        repository.save(entry);
    }
}
