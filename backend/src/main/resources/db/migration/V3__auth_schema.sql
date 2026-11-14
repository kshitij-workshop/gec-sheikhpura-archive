-- Phase 02 authentication schema.
-- Adds forced password rotation, refresh-token family expiry, and single-use
-- email verification / password reset tokens.

ALTER TABLE users
    ADD COLUMN password_change_required boolean NOT NULL DEFAULT false;

ALTER TABLE refresh_tokens
    ADD COLUMN family_expires_at timestamptz;

UPDATE refresh_tokens
SET family_expires_at = expires_at
WHERE family_expires_at IS NULL;

ALTER TABLE refresh_tokens
    ALTER COLUMN family_expires_at SET NOT NULL;

ALTER TABLE refresh_tokens
    ADD CONSTRAINT refresh_tokens_family_expiry_check
        CHECK (family_expires_at >= expires_at);

CREATE TABLE auth_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    purpose varchar(30) NOT NULL,
    token_hash varchar(64) NOT NULL,
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT auth_tokens_user_fk
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT auth_tokens_purpose_check CHECK (
        purpose IN ('EMAIL_VERIFICATION', 'PASSWORD_RESET')
    ),
    CONSTRAINT auth_tokens_hash_check CHECK (token_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT auth_tokens_expiry_check CHECK (expires_at > created_at)
);

CREATE UNIQUE INDEX auth_tokens_hash_unique ON auth_tokens (token_hash);
CREATE INDEX auth_tokens_user_purpose_idx
    ON auth_tokens (user_id, purpose, created_at DESC);
CREATE INDEX auth_tokens_expiry_idx
    ON auth_tokens (expires_at)
    WHERE used_at IS NULL;

UPDATE app_metadata
SET metadata_value = 'phase-02',
    updated_at = now()
WHERE metadata_key = 'schema_phase';
