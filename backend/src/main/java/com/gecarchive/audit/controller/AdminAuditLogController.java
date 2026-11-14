package com.gecarchive.audit.controller;

import java.util.UUID;

import com.gecarchive.audit.dto.AuditLogResponse;
import com.gecarchive.audit.service.AuditLogQueryService;
import com.gecarchive.common.dto.PageResponse;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/audit-logs")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class AdminAuditLogController {

    private final AuditLogQueryService auditLogs;

    public AdminAuditLogController(AuditLogQueryService auditLogs) {
        this.auditLogs = auditLogs;
    }

    @GetMapping
    public PageResponse<AuditLogResponse> list(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) UUID entityId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return auditLogs.list(action, entityType, entityId, page, size);
    }
}
