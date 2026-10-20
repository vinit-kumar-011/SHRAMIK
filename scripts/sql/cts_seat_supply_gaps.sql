-- =============================================================================
-- CTS seat matrix -> supply_observations  ·  GAPS REPORT (read-only)
--
-- Safe to run in the Supabase SQL Editor (single SELECT, changes nothing).
-- Lists every reason seat rows are left out of the preview, biggest first,
-- so reviewers know which trade -> skill and district mappings matter most.
--
-- issue values:
--   TRADE_NOT_MAPPED       no approved DGT_CTS_TRADE mapping for this trade label
--   TRADE_MAPS_TO_MANY     the trade maps to more than one skill (would double count)
--   SKILL_INACTIVE         mapped skill exists but skills.is_active = false
--   DISTRICT_NOT_MAPPED    no HIGH/MEDIUM DGT_CTS_DISTRICT_LABEL mapping
--   DISTRICT_AMBIGUOUS     the label maps to more than one district
--   STATE_MISMATCH         district mapping's state differs from the state label mapping
--   NO_SOURCE_RETRIEVAL    row has no source_retrieval_id, so its source cannot be proven
--   CAPABILITY_NOT_REGISTERED  not exactly one source_capabilities row for (source,
--                          CTS_PROVISIONAL_SEAT_CAPACITY, DISTRICT_SECTOR_SKILL), or it
--                          lacks unit 'seats' / the state / the year; #60 would refuse it
-- A row can appear under several issues.
-- =============================================================================
with seat as (
    select s.*,
           upper(btrim(s.state_name_source)) as state_label,
           upper(btrim(s.state_name_source)) || '::' || upper(btrim(s.district_name_source)) as district_label,
           btrim(s.trade_name_source) as trade_label
    from public.stg_dgt_cts_seat_matrix s
),
state_map as (
    select upper(btrim(source_code)) as label, min(state_id) as state_id
    from public.source_geography_mappings
    where source_code_system = 'DGT_CTS_STATE_LABEL' and geography_level = 'STATE'
      and state_id is not null and mapping_confidence in ('HIGH', 'MEDIUM')
    group by upper(btrim(source_code))
    having count(distinct state_id) = 1
),
district_all as (
    select upper(btrim(source_code)) as label,
           count(distinct district_id) as districts, min(state_id) as state_id
    from public.source_geography_mappings
    where source_code_system = 'DGT_CTS_DISTRICT_LABEL' and geography_level = 'DISTRICT'
      and district_id is not null and mapping_confidence in ('HIGH', 'MEDIUM')
    group by upper(btrim(source_code))
),
trade_all as (
    select btrim(m.taxonomy_code) as trade_label,
           count(distinct m.skill_id) as skills,
           bool_or(k.is_active) as any_active
    from public.skill_taxonomy_mappings m
    join public.skills k on k.id = m.skill_id
    where m.taxonomy_name = 'DGT_CTS_TRADE'
      and m.mapping_method in ('OFFICIAL_CROSSWALK', 'MANUAL')
      and m.mapping_confidence in ('HIGH', 'MEDIUM')
    group by btrim(m.taxonomy_code)
),
cap_count as (
    select seat.id, count(c.*) as caps,
           bool_and(btrim(c.unit) = 'seats'
                    and (nullif(btrim(c.state_scope), '') is null
                         or upper(c.state_scope) in ('NATIONAL', upper(coalesce(d.state_id, ''))))
                    and (c.coverage_start is null or left(c.coverage_start::text, 4)::int <= seat.academic_session)
                    and (c.coverage_end   is null or left(c.coverage_end::text, 4)::int   >= seat.academic_session)
                    and nullif(btrim(c.flow_stock_semantics), '') is not null) as fits
    from seat
    join public.source_retrievals r on r.id = seat.source_retrieval_id
    left join district_all d on d.label = seat.district_label and d.districts = 1
    left join public.source_capabilities c
      on c.source_id = r.source_id
     and c.signal_type = 'CTS_PROVISIONAL_SEAT_CAPACITY'
     and upper(c.observation_grain) = 'DISTRICT_SECTOR_SKILL'
    group by seat.id
),
issues as (
    select 'TRADE_NOT_MAPPED' as issue, seat.trade_label as label, seat.*
    from seat left join trade_all t on t.trade_label = seat.trade_label
    where t.trade_label is null
    union all
    select 'TRADE_MAPS_TO_MANY', seat.trade_label, seat.*
    from seat join trade_all t on t.trade_label = seat.trade_label where t.skills > 1
    union all
    select 'SKILL_INACTIVE', seat.trade_label, seat.*
    from seat join trade_all t on t.trade_label = seat.trade_label where t.skills = 1 and not t.any_active
    union all
    select 'DISTRICT_NOT_MAPPED', seat.district_label, seat.*
    from seat left join district_all d on d.label = seat.district_label where d.label is null
    union all
    select 'DISTRICT_AMBIGUOUS', seat.district_label, seat.*
    from seat join district_all d on d.label = seat.district_label where d.districts > 1
    union all
    select 'STATE_MISMATCH', seat.district_label, seat.*
    from seat join district_all d on d.label = seat.district_label and d.districts = 1
    left join state_map st on st.label = seat.state_label
    where st.state_id is distinct from d.state_id
    union all
    select 'NO_SOURCE_RETRIEVAL', seat.trade_label, seat.*
    from seat where seat.source_retrieval_id is null
    union all
    select 'CAPABILITY_NOT_REGISTERED', seat.trade_label, seat.*
    from seat join cap_count cc on cc.id = seat.id where cc.caps <> 1 or not cc.fits
)
select issue, label,
       count(*) as seat_rows,
       sum(provisional_seat_capacity) as seats,
       count(distinct district_label) as districts,
       count(distinct iti_mis_code_source) as itis
from issues
group by issue, label
order by issue, seats desc, label;
