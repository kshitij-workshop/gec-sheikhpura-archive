-- Phase 04 upload authorization state.
-- Raw Cloudinary responses are never trusted or persisted until verified.

CREATE TABLE upload_authorizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    submission_id uuid NOT NULL,
    public_id varchar(255) NOT NULL,
    upload_signature varchar(128) NOT NULL,
    upload_timestamp bigint NOT NULL,
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT upload_authorizations_user_fk
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT upload_authorizations_submission_fk
        FOREIGN KEY (submission_id) REFERENCES photo_submissions (id) ON DELETE RESTRICT,
    CONSTRAINT upload_authorizations_public_id_unique UNIQUE (public_id),
    CONSTRAINT upload_authorizations_expiry_check CHECK (expires_at > created_at),
    CONSTRAINT upload_authorizations_timestamp_check CHECK (upload_timestamp > 0)
);

CREATE INDEX upload_authorizations_submission_idx
    ON upload_authorizations (submission_id, created_at);
CREATE INDEX upload_authorizations_expiry_idx
    ON upload_authorizations (expires_at)
    WHERE used_at IS NULL;

UPDATE app_metadata
SET metadata_value = 'phase-04',
    updated_at = now()
WHERE metadata_key = 'schema_phase';
