-- Seed a small, traceable NCO-2015 occupation pilot.
-- NCO identity mappings are exact source-native mappings.
-- NIC sector assignments are provisional manual groupings: there is no official
-- one-to-one NCO-to-NIC crosswalk encoded here. Keep these records inactive
-- until their sector assignment is reviewed.

with seed(
  skill_id, skill_code, skill_name, sector_code,
  nco_code, nco_family, sector_note
) as (
  values
    ('nco2015_7411_0100', 'NCO2015-7411.0100', 'Electrician, General', 'F',
     '7411.0100', 'Building and Related Electricians',
     'Provisional NIC 2008 F (Construction) grouping based on the NCO family Building and Related Electricians. No official NCO-to-NIC crosswalk is asserted; inactive pending review.'),
    ('nco2015_7233_0100', 'NCO2015-7233.0100', 'Fitter, General', 'C',
     '7233.0100', 'Agricultural and Industrial Machinery Mechanics and Repairers',
     'Provisional NIC 2008 C (Manufacturing) grouping for an industrial machinery-fitting role. The NCO family spans multiple employer industries; no official NCO-to-NIC crosswalk is asserted; inactive pending review.'),
    ('nco2015_7112_0200', 'NCO2015-7112.0200', 'Bricklayerer, Construction', 'F',
     '7112.0200', 'Bricklayers and Related Workers',
     'Provisional NIC 2008 F (Construction) grouping based on the exact NCO occupation title. No official NCO-to-NIC crosswalk is asserted; inactive pending review.'),
    ('nco2015_7112_0100', 'NCO2015-7112.0100', 'Stone Mason', 'F',
     '7112.0100', 'Bricklayers and Related Workers',
     'Provisional NIC 2008 F (Construction) grouping based on the NCO occupation family. No official NCO-to-NIC crosswalk is asserted; inactive pending review.'),
    ('nco2015_2512_0100', 'NCO2015-2512.0100', 'Computer Programmer/Software Engineer', 'J',
     '2512.0100', 'Software Developers',
     'Provisional NIC 2008 J (Information and communication) grouping for an ICT occupation. The role may be employed in other industries; no official NCO-to-NIC crosswalk is asserted; inactive pending review.'),
    ('nco2015_2513_0101', 'NCO2015-2513.0101', 'Web Developer', 'J',
     '2513.0101', 'Web and Multimedia Developers',
     'Provisional NIC 2008 J (Information and communication) grouping for an ICT occupation. The role may be employed in other industries; no official NCO-to-NIC crosswalk is asserted; inactive pending review.'),
    ('nco2015_2519_0402', 'NCO2015-2519.0402', 'Test Engineer – Software Products', 'J',
     '2519.0402', 'Software and Application Developers and Analysts Not Elsewhere Classified',
     'Provisional NIC 2008 J (Information and communication) grouping for a software-product testing occupation. The role may be employed in other industries; no official NCO-to-NIC crosswalk is asserted; inactive pending review.')
),
inserted_skills as (
  insert into public.skills (
    id, code, name, sector_id,
    sector_mapping_method, sector_mapping_confidence,
    sector_mapping_source_id, sector_mapping_note,
    description, is_active
  )
  select
    seed.skill_id,
    seed.skill_code,
    seed.skill_name,
    sec.id,
    'MANUAL',
    'LOW',
    null,
    seed.sector_note,
    'Occupation title and NCO 2015 code are copied from the official DGE NCO occupation browser. Sector assignment is provisional only; do not use in forecasting until reviewed.',
    false
  from seed
  join public.sectors sec on sec.code = seed.sector_code
  on conflict do nothing
  returning id, code
)
insert into public.skill_taxonomy_mappings (
  skill_id, taxonomy_name, taxonomy_version, taxonomy_code,
  mapping_method, mapping_confidence, source_id, mapping_note
)
select
  s.id,
  'NCO-2015',
  '2015',
  seed.nco_code,
  'OFFICIAL_CROSSWALK',
  'HIGH',
  ds.id,
  'Exact source-native NCO 2015 occupation identity mapping. NCO family: '
    || seed.nco_family
    || '. Source: https://www.dge.gov.in/nat and https://www.dge.gov.in/nco-2015. This mapping validates the occupation code/title only; it does not validate the provisional NIC sector assignment.'
from seed
join public.skills s on s.code = seed.skill_code
join public.data_sources ds
  on ds.id = '10000000-0000-4000-8000-000000000003'::uuid
on conflict do nothing;