-- Attach exact NCO-2015 source-native mappings to the inactive pilot occupations.
-- Sector mapping notes remain provisional; this does not activate any skill.
with mapping_data(skill_code, nco_code, nco_family) as (
  values
    ('NCO2015-7411.0100', '7411.0100', 'Building and Related Electricians'),
    ('NCO2015-7233.0100', '7233.0100', 'Agricultural and Industrial Machinery Mechanics and Repairers'),
    ('NCO2015-7112.0200', '7112.0200', 'Bricklayers and Related Workers'),
    ('NCO2015-7112.0100', '7112.0100', 'Bricklayers and Related Workers'),
    ('NCO2015-2512.0100', '2512.0100', 'Software Developers'),
    ('NCO2015-2513.0101', '2513.0101', 'Web and Multimedia Developers'),
    ('NCO2015-2519.0402', '2519.0402', 'Software and Application Developers and Analysts Not Elsewhere Classified')
)
insert into public.skill_taxonomy_mappings (
  skill_id, taxonomy_name, taxonomy_version, taxonomy_code,
  mapping_method, mapping_confidence, source_id, mapping_note
)
select
  s.id,
  'NCO-2015',
  '2015',
  mapping_data.nco_code,
  'OFFICIAL_CROSSWALK',
  'HIGH',
  ds.id,
  'Exact source-native NCO 2015 occupation identity mapping. NCO family: '
    || mapping_data.nco_family
    || '. Source: https://www.dge.gov.in/nat and https://www.dge.gov.in/nco-2015. This mapping validates the occupation code/title only; it does not validate the provisional NIC sector assignment.'
from mapping_data
join public.skills s on s.code = mapping_data.skill_code
join public.data_sources ds
  on ds.id = '10000000-0000-4000-8000-000000000003'::uuid
on conflict do nothing;