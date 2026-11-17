-- Administrators can re-file a photograph into an album of another event.
--
-- V2 tied every photo to its submission's event through the composite foreign
-- key photos_submission_event_fk. That invariant holds while a submission is
-- created, but it blocks a deliberate moderation correction: moving a
-- mis-filed photograph to the event it actually belongs to. The photograph
-- keeps its submission as provenance, while its event and album are validated
-- by the application and by the remaining photos_album_event_fk constraint.

ALTER TABLE photos
    DROP CONSTRAINT photos_submission_event_fk;

ALTER TABLE photos
    ADD CONSTRAINT photos_submission_fk
        FOREIGN KEY (submission_id) REFERENCES photo_submissions (id) ON DELETE RESTRICT;
