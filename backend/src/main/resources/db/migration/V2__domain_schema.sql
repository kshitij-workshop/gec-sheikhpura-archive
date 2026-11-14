-- Phase 01 domain schema.
-- Enumerations are constrained varchar columns mapped to Java enums.
-- All timestamps are UTC timestamptz values.

CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email varchar(320) NOT NULL,
    password_hash varchar(255) NOT NULL,
    display_name varchar(120) NOT NULL,
    role varchar(20) NOT NULL DEFAULT 'USER',
    status varchar(30) NOT NULL DEFAULT 'PENDING_VERIFICATION',
    email_verified_at timestamptz,
    last_login_at timestamptz,
    version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT users_role_check CHECK (role IN ('USER', 'ADMIN', 'SUPER_ADMIN')),
    CONSTRAINT users_status_check CHECK (
        status IN ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED')
    ),
    CONSTRAINT users_email_not_blank CHECK (btrim(email) <> ''),
    CONSTRAINT users_password_hash_not_blank CHECK (btrim(password_hash) <> ''),
    CONSTRAINT users_display_name_not_blank CHECK (btrim(display_name) <> '')
);

CREATE UNIQUE INDEX users_email_lower_unique ON users (lower(email));

CREATE TABLE refresh_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    token_hash varchar(64) NOT NULL,
    family_id uuid NOT NULL,
    issued_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    revocation_reason varchar(40),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT refresh_tokens_user_fk
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT refresh_tokens_expiry_check CHECK (expires_at > issued_at),
    CONSTRAINT refresh_tokens_hash_check CHECK (token_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT refresh_tokens_revocation_check CHECK (
        revocation_reason IS NULL OR revoked_at IS NOT NULL
    )
);

CREATE UNIQUE INDEX refresh_tokens_token_hash_unique ON refresh_tokens (token_hash);
CREATE INDEX refresh_tokens_user_idx ON refresh_tokens (user_id);
CREATE INDEX refresh_tokens_family_idx ON refresh_tokens (family_id);

CREATE TABLE academic_years (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    label varchar(40) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT academic_years_label_unique UNIQUE (label),
    CONSTRAINT academic_years_dates_check CHECK (start_date < end_date)
);

CREATE TABLE categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(80) NOT NULL,
    slug varchar(80) NOT NULL,
    description text,
    sort_order integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT categories_name_unique UNIQUE (name),
    CONSTRAINT categories_slug_unique UNIQUE (slug),
    CONSTRAINT categories_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT categories_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE TABLE events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year_id uuid NOT NULL,
    category_id uuid NOT NULL,
    created_by_user_id uuid NOT NULL,
    title varchar(160) NOT NULL,
    slug varchar(180) NOT NULL,
    description text,
    event_date date NOT NULL,
    location varchar(160),
    published boolean NOT NULL DEFAULT false,
    featured boolean NOT NULL DEFAULT false,
    version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    CONSTRAINT events_academic_year_fk
        FOREIGN KEY (academic_year_id) REFERENCES academic_years (id) ON DELETE RESTRICT,
    CONSTRAINT events_category_fk
        FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT,
    CONSTRAINT events_created_by_fk
        FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT events_slug_unique UNIQUE (slug),
    CONSTRAINT events_title_not_blank CHECK (btrim(title) <> ''),
    CONSTRAINT events_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE INDEX events_year_date_idx ON events (academic_year_id, event_date);
CREATE INDEX events_category_date_idx ON events (category_id, event_date);
CREATE INDEX events_public_idx ON events (published, event_date DESC)
    WHERE deleted_at IS NULL;

CREATE TABLE albums (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL,
    created_by_user_id uuid NOT NULL,
    title varchar(160) NOT NULL,
    slug varchar(180) NOT NULL,
    description text,
    published boolean NOT NULL DEFAULT false,
    sort_order integer NOT NULL DEFAULT 0,
    version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    CONSTRAINT albums_event_fk
        FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE RESTRICT,
    CONSTRAINT albums_created_by_fk
        FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT albums_slug_unique UNIQUE (slug),
    CONSTRAINT albums_id_event_unique UNIQUE (id, event_id),
    CONSTRAINT albums_title_not_blank CHECK (btrim(title) <> ''),
    CONSTRAINT albums_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE INDEX albums_event_public_idx ON albums (event_id, published, deleted_at);

CREATE TABLE photo_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    submitted_by_user_id uuid NOT NULL,
    event_id uuid NOT NULL,
    album_id uuid,
    status varchar(20) NOT NULL DEFAULT 'PENDING',
    note text,
    version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT photo_submissions_user_fk
        FOREIGN KEY (submitted_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT photo_submissions_event_fk
        FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE RESTRICT,
    CONSTRAINT photo_submissions_album_event_fk
        FOREIGN KEY (album_id, event_id) REFERENCES albums (id, event_id) ON DELETE RESTRICT,
    CONSTRAINT photo_submissions_status_check CHECK (
        status IN ('PENDING', 'IN_REVIEW', 'COMPLETED', 'WITHDRAWN')
    ),
    CONSTRAINT photo_submissions_id_event_unique UNIQUE (id, event_id)
);

CREATE INDEX photo_submissions_user_created_idx
    ON photo_submissions (submitted_by_user_id, created_at DESC);
CREATE INDEX photo_submissions_status_created_idx
    ON photo_submissions (status, created_at);

CREATE TABLE photos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id uuid,
    event_id uuid NOT NULL,
    album_id uuid,
    uploaded_by_user_id uuid NOT NULL,
    approved_by_user_id uuid,
    title varchar(160),
    caption text,
    alt_text varchar(300),
    cloudinary_public_id varchar(255) NOT NULL,
    cloudinary_asset_id varchar(255) NOT NULL,
    format varchar(10) NOT NULL,
    width_px integer NOT NULL,
    height_px integer NOT NULL,
    size_bytes bigint NOT NULL,
    taken_at timestamptz,
    status varchar(20) NOT NULL DEFAULT 'PENDING',
    sort_order integer NOT NULL DEFAULT 0,
    approved_at timestamptz,
    version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    CONSTRAINT photos_event_fk
        FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE RESTRICT,
    CONSTRAINT photos_uploader_fk
        FOREIGN KEY (uploaded_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT photos_approver_fk
        FOREIGN KEY (approved_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT photos_album_event_fk
        FOREIGN KEY (album_id, event_id) REFERENCES albums (id, event_id) ON DELETE RESTRICT,
    CONSTRAINT photos_submission_event_fk
        FOREIGN KEY (submission_id, event_id)
        REFERENCES photo_submissions (id, event_id) ON DELETE RESTRICT,
    CONSTRAINT photos_cloudinary_public_id_unique UNIQUE (cloudinary_public_id),
    CONSTRAINT photos_cloudinary_asset_id_unique UNIQUE (cloudinary_asset_id),
    CONSTRAINT photos_status_check CHECK (
        status IN ('PENDING', 'APPROVED', 'REJECTED', 'FLAGGED', 'HIDDEN', 'REMOVED')
    ),
    CONSTRAINT photos_format_check CHECK (format IN ('jpg', 'jpeg', 'png', 'webp')),
    CONSTRAINT photos_dimensions_check CHECK (width_px > 0 AND height_px > 0),
    CONSTRAINT photos_size_check CHECK (size_bytes > 0),
    CONSTRAINT photos_approved_album_check CHECK (
        status <> 'APPROVED' OR album_id IS NOT NULL
    ),
    CONSTRAINT photos_approved_metadata_check CHECK (
        status <> 'APPROVED' OR (approved_at IS NOT NULL AND approved_by_user_id IS NOT NULL)
    ),
    CONSTRAINT photos_alt_text_not_blank CHECK (
        alt_text IS NULL OR btrim(alt_text) <> ''
    )
);

CREATE INDEX photos_status_idx ON photos (status, deleted_at);
CREATE INDEX photos_album_idx ON photos (album_id, status, sort_order);
CREATE INDEX photos_event_idx ON photos (event_id, status);
CREATE INDEX photos_uploader_created_idx
    ON photos (uploaded_by_user_id, created_at DESC);
CREATE INDEX photos_submission_idx ON photos (submission_id);
CREATE INDEX photos_public_idx ON photos (event_id, album_id, sort_order)
    WHERE status = 'APPROVED' AND deleted_at IS NULL;

CREATE TABLE photo_moderations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id uuid NOT NULL,
    actor_user_id uuid NOT NULL,
    actor_role varchar(20) NOT NULL,
    actor_display_name varchar(120) NOT NULL,
    action varchar(20) NOT NULL,
    from_status varchar(20),
    to_status varchar(20) NOT NULL,
    reason varchar(1000),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT photo_moderations_photo_fk
        FOREIGN KEY (photo_id) REFERENCES photos (id) ON DELETE RESTRICT,
    CONSTRAINT photo_moderations_actor_fk
        FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT photo_moderations_action_check CHECK (
        action IN ('SUBMIT', 'APPROVE', 'REJECT', 'FLAG', 'HIDE', 'REMOVE', 'RESTORE')
    ),
    CONSTRAINT photo_moderations_actor_role_check CHECK (
        actor_role IN ('USER', 'ADMIN', 'SUPER_ADMIN')
    ),
    CONSTRAINT photo_moderations_from_status_check CHECK (
        from_status IS NULL OR from_status IN (
            'PENDING', 'APPROVED', 'REJECTED', 'FLAGGED', 'HIDDEN', 'REMOVED'
        )
    ),
    CONSTRAINT photo_moderations_to_status_check CHECK (
        to_status IN ('PENDING', 'APPROVED', 'REJECTED', 'FLAGGED', 'HIDDEN', 'REMOVED')
    )
);

CREATE INDEX photo_moderations_photo_created_idx
    ON photo_moderations (photo_id, created_at DESC);

CREATE TABLE photo_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id uuid NOT NULL,
    reported_by_user_id uuid NOT NULL,
    category varchar(30) NOT NULL,
    details varchar(1000),
    status varchar(20) NOT NULL DEFAULT 'PENDING',
    resolution_note varchar(1000),
    handled_by_user_id uuid,
    handled_at timestamptz,
    version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT photo_reports_photo_fk
        FOREIGN KEY (photo_id) REFERENCES photos (id) ON DELETE RESTRICT,
    CONSTRAINT photo_reports_reporter_fk
        FOREIGN KEY (reported_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT photo_reports_handler_fk
        FOREIGN KEY (handled_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT photo_reports_category_check CHECK (
        category IN ('INAPPROPRIATE', 'COPYRIGHT', 'PRIVACY', 'MISATTRIBUTION', 'OTHER')
    ),
    CONSTRAINT photo_reports_status_check CHECK (
        status IN ('PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED')
    ),
    CONSTRAINT photo_reports_handled_check CHECK (
        handled_at IS NULL OR handled_by_user_id IS NOT NULL
    )
);

CREATE UNIQUE INDEX photo_reports_open_unique
    ON photo_reports (photo_id, reported_by_user_id)
    WHERE status IN ('PENDING', 'UNDER_REVIEW');
CREATE INDEX photo_reports_status_created_idx ON photo_reports (status, created_at);
CREATE INDEX photo_reports_photo_idx ON photo_reports (photo_id);

CREATE TABLE photo_removal_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id uuid NOT NULL,
    requested_by_user_id uuid NOT NULL,
    reason varchar(1000) NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'PENDING',
    resolution_note varchar(1000),
    handled_by_user_id uuid,
    handled_at timestamptz,
    version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT photo_removal_requests_photo_fk
        FOREIGN KEY (photo_id) REFERENCES photos (id) ON DELETE RESTRICT,
    CONSTRAINT photo_removal_requests_requester_fk
        FOREIGN KEY (requested_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT photo_removal_requests_handler_fk
        FOREIGN KEY (handled_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT photo_removal_requests_status_check CHECK (
        status IN ('PENDING', 'APPROVED', 'REJECTED')
    ),
    CONSTRAINT photo_removal_requests_reason_not_blank CHECK (btrim(reason) <> ''),
    CONSTRAINT photo_removal_requests_handled_check CHECK (
        handled_at IS NULL OR handled_by_user_id IS NOT NULL
    )
);

CREATE UNIQUE INDEX photo_removal_requests_open_unique
    ON photo_removal_requests (photo_id, requested_by_user_id)
    WHERE status = 'PENDING';
CREATE INDEX photo_removal_requests_status_created_idx
    ON photo_removal_requests (status, created_at);
CREATE INDEX photo_removal_requests_photo_idx ON photo_removal_requests (photo_id);

CREATE TABLE event_suggestions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    suggested_by_user_id uuid NOT NULL,
    category_id uuid,
    academic_year_id uuid,
    reviewed_by_user_id uuid,
    created_event_id uuid,
    title varchar(160) NOT NULL,
    description text,
    approximate_date date,
    status varchar(20) NOT NULL DEFAULT 'PENDING',
    review_note varchar(1000),
    reviewed_at timestamptz,
    version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT event_suggestions_suggester_fk
        FOREIGN KEY (suggested_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT event_suggestions_category_fk
        FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT,
    CONSTRAINT event_suggestions_academic_year_fk
        FOREIGN KEY (academic_year_id) REFERENCES academic_years (id) ON DELETE RESTRICT,
    CONSTRAINT event_suggestions_reviewer_fk
        FOREIGN KEY (reviewed_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT event_suggestions_created_event_fk
        FOREIGN KEY (created_event_id) REFERENCES events (id) ON DELETE RESTRICT,
    CONSTRAINT event_suggestions_status_check CHECK (
        status IN ('PENDING', 'APPROVED', 'REJECTED')
    ),
    CONSTRAINT event_suggestions_title_not_blank CHECK (btrim(title) <> ''),
    CONSTRAINT event_suggestions_reviewed_check CHECK (
        reviewed_at IS NULL OR reviewed_by_user_id IS NOT NULL
    ),
    CONSTRAINT event_suggestions_created_event_unique UNIQUE (created_event_id)
);

CREATE INDEX event_suggestions_status_created_idx
    ON event_suggestions (status, created_at);
CREATE INDEX event_suggestions_suggester_created_idx
    ON event_suggestions (suggested_by_user_id, created_at DESC);

CREATE TABLE contributor_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,
    created_by_user_id uuid,
    display_name varchar(120) NOT NULL,
    slug varchar(140) NOT NULL,
    bio text,
    published boolean NOT NULL DEFAULT false,
    version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    CONSTRAINT contributor_profiles_user_fk
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT contributor_profiles_created_by_fk
        FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT contributor_profiles_user_unique UNIQUE (user_id),
    CONSTRAINT contributor_profiles_slug_unique UNIQUE (slug),
    CONSTRAINT contributor_profiles_display_name_not_blank CHECK (btrim(display_name) <> ''),
    CONSTRAINT contributor_profiles_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE INDEX contributor_profiles_public_idx
    ON contributor_profiles (published, display_name)
    WHERE deleted_at IS NULL;

CREATE TABLE photo_photographers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id uuid NOT NULL,
    contributor_profile_id uuid,
    credit_name varchar(120) NOT NULL,
    credit_order smallint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT photo_photographers_photo_fk
        FOREIGN KEY (photo_id) REFERENCES photos (id) ON DELETE RESTRICT,
    CONSTRAINT photo_photographers_contributor_fk
        FOREIGN KEY (contributor_profile_id) REFERENCES contributor_profiles (id) ON DELETE RESTRICT,
    CONSTRAINT photo_photographers_order_unique UNIQUE (photo_id, credit_order),
    CONSTRAINT photo_photographers_order_check CHECK (credit_order >= 0),
    CONSTRAINT photo_photographers_credit_name_not_blank CHECK (btrim(credit_name) <> '')
);

CREATE INDEX photo_photographers_contributor_idx
    ON photo_photographers (contributor_profile_id);

CREATE TABLE audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id uuid,
    actor_role varchar(20),
    actor_display_name varchar(120),
    action varchar(80) NOT NULL,
    entity_type varchar(60) NOT NULL,
    entity_id uuid,
    before_state jsonb,
    after_state jsonb,
    ip_address varchar(45),
    user_agent varchar(255),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT audit_logs_actor_fk
        FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT audit_logs_actor_role_check CHECK (
        actor_role IS NULL OR actor_role IN ('USER', 'ADMIN', 'SUPER_ADMIN')
    ),
    CONSTRAINT audit_logs_action_not_blank CHECK (btrim(action) <> ''),
    CONSTRAINT audit_logs_entity_type_not_blank CHECK (btrim(entity_type) <> '')
);

CREATE INDEX audit_logs_created_idx ON audit_logs (created_at DESC);
CREATE INDEX audit_logs_entity_idx ON audit_logs (entity_type, entity_id);
CREATE INDEX audit_logs_actor_created_idx ON audit_logs (actor_user_id, created_at DESC);

CREATE FUNCTION reject_append_only_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Table % is append-only', TG_TABLE_NAME
        USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER photo_moderations_append_only
    BEFORE UPDATE OR DELETE ON photo_moderations
    FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();

CREATE TRIGGER photo_moderations_no_truncate
    BEFORE TRUNCATE ON photo_moderations
    FOR EACH STATEMENT EXECUTE FUNCTION reject_append_only_mutation();

CREATE TRIGGER audit_logs_append_only
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();

CREATE TRIGGER audit_logs_no_truncate
    BEFORE TRUNCATE ON audit_logs
    FOR EACH STATEMENT EXECUTE FUNCTION reject_append_only_mutation();

UPDATE app_metadata
SET metadata_value = 'phase-01',
    updated_at = now()
WHERE metadata_key = 'schema_phase';
