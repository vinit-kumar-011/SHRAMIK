create table if not exists public.stg_nco_2015_occupations (
  nco_code text primary key
    check (nco_code ~ '^[0-9]{4}\.[0-9]{4}$'),
  occupation_title text not null
    check (length(btrim(occupation_title)) > 0),
  nco_2004_code text,
  division text,
  sub_division text,
  occupation_group text,
  occupation_family text,
  source_id uuid not null references public.data_sources(id),
  source_url text not null,
  source_page integer not null check (source_page >= 0),
  source_row_number integer not null check (source_row_number > 0),
  source_snapshot_sha256 text not null
    check (source_snapshot_sha256 ~ '^[a-f0-9]{64}$'),
  retrieved_at timestamptz not null,
  imported_at timestamptz not null default now(),
  is_current boolean not null default true
);

alter table public.stg_nco_2015_occupations enable row level security;

comment on table public.stg_nco_2015_occupations is
  'Source-faithful staging snapshot of the official DGE NCO-2015 occupation catalogue. It intentionally has no NIC sector assignment; reviewed relationships to canonical skills belong in mapping tables.';
comment on column public.stg_nco_2015_occupations.is_current is
  'True when the occupation code is present in the latest successfully imported complete snapshot; older rows are retained for traceability.';
