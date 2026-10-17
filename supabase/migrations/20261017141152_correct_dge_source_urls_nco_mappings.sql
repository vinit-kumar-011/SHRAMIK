update public.skill_taxonomy_mappings
set mapping_note = replace(
  replace(
    mapping_note,
    'https://www.dge.gov.in/nat',
    'https://dge.gov.in/nat'
  ),
  'https://www.dge.gov.in/nco-2015',
  'https://dge.gov.in/nco-2015'
)
where taxonomy_name = 'NCO-2015'
  and mapping_note like '%www.dge.gov.in%';
