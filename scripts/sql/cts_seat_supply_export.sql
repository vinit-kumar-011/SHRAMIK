-- =============================================================================
-- CTS seat matrix -> canonical SUPPLY CSV  ·  EXPORT (read-only)
--
-- Safe to run in the Supabase SQL Editor: a single SELECT, changes nothing.
-- Its result IS the supply CSV for the canonical importer from PR #60
-- (backend/app/ingestion/canonical_csv.py, kind="supply"). Export the result
-- as CSV and pass it to:
--     python -m scripts.ingest_canonical_observations --supply-csv <file> ...
-- That importer does the validation and the guarded, idempotent write.
-- This file never writes.
--
--   stg_dgt_cts_seat_matrix (ITI x trade x academic session)
--   -> one row per DISTRICT x SECTOR x SKILL x academic session
--   training_capacity = SUM(provisional_seat_capacity), quantity_semantics = CAPACITY
--
-- Grain is DISTRICT_SECTOR_SKILL because that is the series grain #60's
-- pipeline reads. sector_id is the skill's own skills.sector_id (a lookup,
-- not a redistribution).
--
-- A seat row is left out (and listed by cts_seat_supply_gaps.sql) when:
--   * its district label has no DGT_CTS_DISTRICT_LABEL mapping at HIGH/MEDIUM
--     confidence, maps to more than one district, or disagrees with the state label;
--   * its trade has no approved DGT_CTS_TRADE -> skill mapping (OFFICIAL_CROSSWALK or
--     MANUAL, HIGH/MEDIUM), maps to more than one skill, or the skill is inactive;
--   * it has no source retrieval (so no source_id can be proven);
--   * there is not exactly one source_capabilities row for (source, signal
--     CTS_PROVISIONAL_SEAT_CAPACITY, grain DISTRICT_SECTOR_SKILL), or that row does
--     not have unit 'seats' / cover the state and year (the same test #60 runs). flow_stock_semantics is copied from that row,
--     so it always matches what #60's capability check expects.
-- Seat capacity is training capacity. It is NOT job demand, completions or
-- employed supply.
-- =============================================================================
with seat as (
    select s.*,
           upper(btrim(s.state_name_source)) as state_label,
           upper(btrim(s.state_name_source)) || '::' || upper(btrim(s.district_name_source)) as district_label,
           btrim(s.trade_name_source) as trade_label
    from public.stg_dgt_cts_seat_matrix s
    where s.source_retrieval_id is not null
),
state_map as (
    select upper(btrim(source_code)) as label, min(state_id) as state_id
    from public.source_geography_mappings
    where source_code_system = 'DGT_CTS_STATE_LABEL' and geography_level = 'STATE'
      and state_id is not null and mapping_confidence in ('HIGH', 'MEDIUM')
    group by upper(btrim(source_code))
    having count(distinct state_id) = 1
),
district_map as (
    select upper(btrim(source_code)) as label,
           min(state_id) as state_id, min(district_id) as district_id,
           min(mapping_method) as mapping_method, min(mapping_confidence) as mapping_confidence
    from public.source_geography_mappings
    where source_code_system = 'DGT_CTS_DISTRICT_LABEL' and geography_level = 'DISTRICT'
      and district_id is not null and mapping_confidence in ('HIGH', 'MEDIUM')
    group by upper(btrim(source_code))
    having count(distinct district_id) = 1
),
trade_map as (
    select btrim(m.taxonomy_code) as trade_label, min(m.skill_id) as skill_id,
           min(k.sector_id) as sector_id,
           string_agg(m.id::text, ',' order by m.id::text) as mapping_ids
    from public.skill_taxonomy_mappings m
    join public.skills k on k.id = m.skill_id
    where m.taxonomy_name = 'DGT_CTS_TRADE'
      and m.mapping_method in ('OFFICIAL_CROSSWALK', 'MANUAL')
      and m.mapping_confidence in ('HIGH', 'MEDIUM')
      and k.is_active
    group by btrim(m.taxonomy_code)
    having count(distinct m.skill_id) = 1
),
joined as (
    select seat.*, d.state_id, d.district_id, d.mapping_method as geo_method,
           d.mapping_confidence as geo_confidence, t.skill_id, t.sector_id, t.mapping_ids
    from seat
    join district_map d on d.label = seat.district_label
    join state_map st on st.label = seat.state_label and st.state_id = d.state_id
    join trade_map t on t.trade_label = seat.trade_label
),
grouped as (
    select state_id, district_id, sector_id, skill_id, academic_session,
           sum(provisional_seat_capacity) as seats,
           count(*) as source_rows,
           count(distinct iti_mis_code_source) as itis,
           count(distinct source_retrieval_id) as retrievals,
           min(source_retrieval_id::text)::uuid as retrieval_id,
           max(publication_date) as publication_date,
           max(source_as_of_date) as as_of_date,
           min(release_status) as release_status,
           count(distinct release_status) as release_statuses,
           string_agg(distinct trade_label, '; ' order by trade_label) as trades,
           string_agg(distinct mapping_ids, ',') as mapping_ids,
           min(geo_method) as geo_method, min(geo_confidence) as geo_confidence
    from joined
    group by state_id, district_id, sector_id, skill_id, academic_session
),
with_source as (
    select g.*, r.source_id
    from grouped g
    join public.source_retrievals r on r.id = g.retrieval_id
    where g.retrievals = 1          -- one provable source file per row
      and g.release_statuses = 1
),
cap as (
    -- same test as #60's validate_source_capabilities: exactly one capability per
    -- (source, signal, grain); then that one must have unit 'seats', cover the
    -- state and the year.
    select w.state_id, w.district_id, w.skill_id, w.academic_session,
           count(*) as caps,
           bool_and(btrim(c.unit) = 'seats'
                    and (nullif(btrim(c.state_scope), '') is null
                         or upper(c.state_scope) in ('NATIONAL', upper(w.state_id)))
                    and (c.coverage_start is null or left(c.coverage_start::text, 4)::int <= w.academic_session)
                    and (c.coverage_end   is null or left(c.coverage_end::text, 4)::int   >= w.academic_session)
                    and nullif(btrim(c.flow_stock_semantics), '') is not null) as fits,
           min(btrim(c.flow_stock_semantics)) as flow_stock_semantics
    from with_source w
    join public.source_capabilities c
      on c.source_id = w.source_id
     and c.signal_type = 'CTS_PROVISIONAL_SEAT_CAPACITY'
     and upper(c.observation_grain) = 'DISTRICT_SECTOR_SKILL'
    group by w.state_id, w.district_id, w.skill_id, w.academic_session
)
select
    w.state_id,
    w.district_id,
    w.sector_id,
    w.skill_id,
    'DISTRICT_SECTOR_SKILL'          as observation_grain,
    'YEAR'                           as period_type,
    w.academic_session               as period_year,
    null::numeric                    as supply_quantity,
    w.seats::numeric                 as training_capacity,
    null::numeric                    as enrollment,
    null::numeric                    as completions,
    'CTS_PROVISIONAL_SEAT_CAPACITY'  as supply_signal_type,
    'seats'                          as unit,
    c.flow_stock_semantics,
    'CAPACITY'                       as quantity_semantics,
    w.source_id,
    w.release_status || ' as of ' || w.as_of_date as source_release,
    w.publication_date               as source_date,
    w.retrieval_id,
    null::uuid                       as evidence_item_id,
    'SOURCE_BACKED'                  as provenance_state,
    'false'                          as is_synthetic,
    null::uuid                       as generation_run_id,
    'Sum of provisional_seat_capacity over ' || w.source_rows || ' ITI x trade rows (' || w.itis
        || ' ITIs; trades: ' || w.trades || ') from the DGT CTS seat matrix, academic session '
        || w.academic_session || '. Trade -> skill via skill_taxonomy_mappings ' || w.mapping_ids
        || '. District via DGT_CTS_DISTRICT_LABEL (' || w.geo_method || '/' || w.geo_confidence
        || '). Sector from skills.sector_id. Training capacity only: not completions, enrolment,'
        || ' employed supply or job demand.'
                                     as transformation_note
from with_source w
join cap c using (state_id, district_id, skill_id, academic_session)
where c.caps = 1 and c.fits
order by w.state_id, w.district_id, w.skill_id, w.academic_session;
