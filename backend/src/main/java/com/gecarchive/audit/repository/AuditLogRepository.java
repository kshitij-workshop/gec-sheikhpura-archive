package com.gecarchive.audit.repository;

import java.util.UUID;

import com.gecarchive.audit.entity.AuditLog;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    Page<AuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<AuditLog> findByEntityTypeAndEntityIdOrderByCreatedAtDesc(
            String entityType, UUID entityId, Pageable pageable);
}
