-- An album title only has to be unique inside its own event. The same title may
-- be reused across events (for example "2K24 Batch" in Dandiya 2025 and
-- Dandiya 2026). Archived albums are excluded so a title becomes reusable after
-- an album is archived.
CREATE UNIQUE INDEX albums_event_title_unique
    ON albums (event_id, lower(title))
    WHERE deleted_at IS NULL;
