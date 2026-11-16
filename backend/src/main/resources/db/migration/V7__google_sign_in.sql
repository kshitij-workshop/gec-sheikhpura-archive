-- Google sign-in.
-- An account may authenticate with Google instead of a password, so the
-- password hash becomes optional while the Google subject becomes the stable
-- identity. Email stays the linking key, and only because Google asserts it is
-- verified; see ADR-0025.

ALTER TABLE users
    ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE users
    ADD COLUMN google_subject varchar(255);

-- Every account must keep at least one way to authenticate. An account without
-- a password hash and without a Google subject would be unreachable.
ALTER TABLE users
    ADD CONSTRAINT users_credential_check
        CHECK (password_hash IS NOT NULL OR google_subject IS NOT NULL);

ALTER TABLE users
    ADD CONSTRAINT users_google_subject_not_blank
        CHECK (google_subject IS NULL OR btrim(google_subject) <> '');

CREATE UNIQUE INDEX users_google_subject_unique
    ON users (google_subject)
    WHERE google_subject IS NOT NULL;
