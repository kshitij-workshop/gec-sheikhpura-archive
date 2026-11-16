-- Anonymous archive visitor counting.
--
-- One row per anonymous visitor identifier per calendar day (UTC). The
-- identifier is a random UUID generated in the browser and stored in
-- localStorage; it is not derived from the IP address, the user agent, or any
-- account. Rows are therefore counts, not identifiers of people, and can be
-- pruned by date without losing the historical totals if a snapshot table is
-- introduced later.
CREATE TABLE visitor_days (
    visitor_id uuid NOT NULL,
    visit_date date NOT NULL,
    first_seen_at timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT visitor_days_pk PRIMARY KEY (visitor_id, visit_date)
);

CREATE INDEX visitor_days_date_idx ON visitor_days (visit_date);
