-- Phase 00 infrastructure baseline.
-- Domain tables are introduced in Phase 01.

CREATE TABLE app_metadata (
    metadata_key   varchar(100) PRIMARY KEY,
    metadata_value text NOT NULL,
    updated_at     timestamptz NOT NULL DEFAULT now()
);

INSERT INTO app_metadata (metadata_key, metadata_value)
VALUES ('schema_phase', 'phase-00');
