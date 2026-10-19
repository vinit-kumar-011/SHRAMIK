-- PROPOSAL ONLY: additive skill/relationship schema for SHRAMIK.
-- Review against the live database, existing naming/types, permissions and migration tool.
-- Do not run in production without review and staging validation.
-- Assumes the ref, obs, analytics schemas and referenced existing tables already exist.

CREATE TABLE IF NOT EXISTS ref.skills (
    skill_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    canonical_code TEXT UNIQUE,
    canonical_name TEXT NOT NULL,
    definition_text TEXT,
    taxonomy_name TEXT,
    taxonomy_version TEXT,
    lifecycle_status TEXT NOT NULL DEFAULT 'ACTIVE'
        CHECK (lifecycle_status IN ('ACTIVE','DEPRECATED','MERGED','PENDING_REVIEW')),
    merged_into_skill_id BIGINT REFERENCES ref.skills(skill_id),
    valid_from DATE,
    valid_to DATE,
    source_url TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from),
    CHECK (merged_into_skill_id IS NULL OR merged_into_skill_id <> skill_id)
);
CREATE INDEX IF NOT EXISTS ix_skills_canonical_name ON ref.skills (lower(canonical_name));

CREATE TABLE IF NOT EXISTS ref.skill_aliases (
    skill_alias_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    skill_id BIGINT NOT NULL REFERENCES ref.skills(skill_id),
    alias_text TEXT NOT NULL,
    alias_normalized TEXT NOT NULL,
    source_id BIGINT REFERENCES meta.source_registry(source_id),
    source_version TEXT,
    mapping_method TEXT NOT NULL,
    mapping_confidence NUMERIC(5,4) CHECK (mapping_confidence IS NULL OR (mapping_confidence >= 0 AND mapping_confidence <= 1)),
    review_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (review_status IN ('PENDING','APPROVED','REJECTED','DEPRECATED')),
    evidence_url TEXT,
    valid_from DATE,
    valid_to DATE,
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);
CREATE INDEX IF NOT EXISTS ix_skill_alias_normalized ON ref.skill_aliases (alias_normalized);
CREATE INDEX IF NOT EXISTS ix_skill_alias_skill ON ref.skill_aliases (skill_id);

CREATE TABLE IF NOT EXISTS ref.occupation_skill_mappings (
    occupation_skill_mapping_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    occupation_id BIGINT NOT NULL REFERENCES ref.occupations(occupation_id),
    skill_id BIGINT NOT NULL REFERENCES ref.skills(skill_id),
    relationship_type TEXT NOT NULL,
    mapping_method TEXT NOT NULL,
    mapping_confidence NUMERIC(5,4) CHECK (mapping_confidence IS NULL OR (mapping_confidence >= 0 AND mapping_confidence <= 1)),
    review_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (review_status IN ('PENDING','APPROVED','REJECTED','DEPRECATED')),
    evidence_url TEXT,
    evidence_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    mapping_version TEXT,
    valid_from DATE,
    valid_to DATE,
    reviewer TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);
CREATE INDEX IF NOT EXISTS ix_occ_skill_occupation ON ref.occupation_skill_mappings (occupation_id, review_status);
CREATE INDEX IF NOT EXISTS ix_occ_skill_skill ON ref.occupation_skill_mappings (skill_id, review_status);

CREATE TABLE IF NOT EXISTS ref.sector_skill_mappings (
    sector_skill_mapping_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sector_id BIGINT NOT NULL REFERENCES ref.sectors(sector_id),
    skill_id BIGINT NOT NULL REFERENCES ref.skills(skill_id),
    relationship_type TEXT NOT NULL,
    mapping_method TEXT NOT NULL,
    mapping_confidence NUMERIC(5,4) CHECK (mapping_confidence IS NULL OR (mapping_confidence >= 0 AND mapping_confidence <= 1)),
    review_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (review_status IN ('PENDING','APPROVED','REJECTED','DEPRECATED')),
    evidence_url TEXT,
    evidence_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    mapping_version TEXT,
    valid_from DATE,
    valid_to DATE,
    reviewer TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);
CREATE INDEX IF NOT EXISTS ix_sector_skill_sector ON ref.sector_skill_mappings (sector_id, review_status);
CREATE INDEX IF NOT EXISTS ix_sector_skill_skill ON ref.sector_skill_mappings (skill_id, review_status);

-- Canonical sector mapping for postings is optional and must only be populated
-- where source text/classification provides a defensible mapping.
ALTER TABLE obs.job_postings
    ADD COLUMN IF NOT EXISTS mapped_sector_id BIGINT REFERENCES ref.sectors(sector_id);

CREATE TABLE IF NOT EXISTS obs.job_posting_skill_mentions (
    job_posting_skill_mention_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    job_posting_id BIGINT NOT NULL REFERENCES obs.job_postings(job_posting_id) ON DELETE CASCADE,
    skill_id BIGINT NOT NULL REFERENCES ref.skills(skill_id),
    mention_count INTEGER NOT NULL DEFAULT 1 CHECK (mention_count > 0),
    extraction_method TEXT NOT NULL,
    extraction_version TEXT NOT NULL,
    mapping_method TEXT NOT NULL,
    mapping_confidence NUMERIC(5,4) CHECK (mapping_confidence IS NULL OR (mapping_confidence >= 0 AND mapping_confidence <= 1)),
    review_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (review_status IN ('PENDING','APPROVED','REJECTED','DEPRECATED')),
    evidence_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (job_posting_id, skill_id, extraction_version, mapping_method)
);
CREATE INDEX IF NOT EXISTS ix_posting_skill_skill ON obs.job_posting_skill_mentions (skill_id, review_status);
CREATE INDEX IF NOT EXISTS ix_posting_skill_posting ON obs.job_posting_skill_mentions (job_posting_id);

-- Preserve legacy skill_label. Backfill skill_id only through reviewed canonical mapping.
ALTER TABLE analytics.emerging_skill_signals
    ADD COLUMN IF NOT EXISTS skill_id BIGINT REFERENCES ref.skills(skill_id);
CREATE INDEX IF NOT EXISTS ix_emerging_skill_signals_skill ON analytics.emerging_skill_signals (skill_id, time_window_start, time_window_end);

-- Important follow-up (not included here): create user-specific watchlist and alert-rule
-- tables using the existing application/auth identity model and RLS/permissions.
-- Do not assume a provider-specific auth.users table without checking the deployed stack.
