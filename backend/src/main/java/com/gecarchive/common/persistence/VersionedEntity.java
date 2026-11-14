package com.gecarchive.common.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.Version;

@MappedSuperclass
public abstract class VersionedEntity extends AuditableEntity {

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    public long getVersion() {
        return version;
    }
}
