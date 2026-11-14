package com.gecarchive.audit.service;

import java.util.UUID;

import com.gecarchive.audit.dto.AuditLogResponse;
import com.gecarchive.audit.entity.AuditLog;
import com.gecarchive.audit.repository.AuditLogRepository;
import com.gecarchive.common.dto.PageResponse;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Read-side access to the append-only audit trail.
 *
 * <p>Filters are optional and combined conjunctively; an empty filter set
 * returns the newest entries first.</p>
 */
@Service
public class AuditLogQueryService {

    private static final int MAX_PAGE_SIZE = 100;

    private final AuditLogRepository auditLogs;

    public AuditLogQueryService(AuditLogRepository auditLogs) {
        this.auditLogs = auditLogs;
    }

    @Transactional(readOnly = true)
    public PageResponse<AuditLogResponse> list(String action, String entityType, UUID entityId, int page, int size) {
        Specification<AuditLog> specification = (root, query, cb) -> cb.conjunction();

        if (action != null && !action.isBlank()) {
            String value = action.trim();
            specification = specification.and((root, query, cb) -> cb.equal(root.get("action"), value));
        }
        if (entityType != null && !entityType.isBlank()) {
            String value = entityType.trim();
            specification = specification.and((root, query, cb) -> cb.equal(root.get("entityType"), value));
        }
        if (entityId != null) {
            UUID value = entityId;
            specification = specification.and((root, query, cb) -> cb.equal(root.get("entityId"), value));
        }

        Page<AuditLog> result = auditLogs.findAll(specification,
                PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), MAX_PAGE_SIZE),
                        Sort.by(Sort.Direction.DESC, "createdAt")));
        return PageResponse.from(result, AuditLogResponse::from);
    }
}
