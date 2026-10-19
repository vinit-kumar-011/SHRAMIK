# SHRAMIK Report Template Design Specification

## Purpose

Define a consistent, readable and professional document design for PDF/in-app reports. This is separate from the Reports web-page UI. The document should resemble an editorial government intelligence report, not a printed dashboard screenshot.

## Design language

Use the SHRAMIK global tokens: warm paper canvas `#F7F6F0`, surface `#FFFEFA`, ink `#171717`, outline `#292929`, muted text `#62625C`, yellow `#F2D34F`, navy `#203A5B`, orange `#EB791D`, teal `#20A89C`. Use the display face from the global system for short headings and the standard sans-serif for body text and data. Use restrained dotted motifs, thin rules, selective yellow highlights and limited worker/industrial artwork. Do not overuse hard shadows inside a printable report.

## Page system

- Default: A4 portrait, white/warm-white print surface, 14–18 mm margins; make these configurable by template.
- Cover: standalone page. Brand mark, report type, title, geography, period, as-of/generation date only when supplied, and understated illustration. Avoid unsupported claims like "official government report" or false agency endorsement.
- Content page: compact running header with report title or scope; page number and report metadata in footer; section number/title; short intro; one or two primary visual elements per page.
- Landscape pages only for very wide tables or complex charts; the template should explicitly mark the section as landscape or split the content instead.
- Page breaks: section starts can request `newPage`; don't force every short section to a new page.
- Tables: repeat table headers in print where Chromium supports it, use compact readable type, no clipped columns, show units in headers or captions, and keep row meaning when split.
- Charts: use SVG or accessible HTML charts, with title, axis labels, units, legend, reference period and text/table alternative. Don't rasterise the whole report. A graph/map can be a local raster/PNG only if it is clearly decorative, not data-bearing.
- Maps: use verified vector boundary geometry and values from report data. Missing geometry/value is distinct from zero.
- Sources: include source name, dataset/version, observation period, geography/grain and retrieval/as-of date when available. Include methodology/version and caveats.
- Synthetic/demo data: label every relevant page/footer and export with `ILLUSTRATIVE — SYNTHETIC DEMO DATA` so there is no ambiguity.

## Standard section order

1. Cover.
2. Executive summary (key findings + selected key indicators).
3. Scope and methodology note.
4. Selected analytical sections in the user's chosen order.
5. Regional, sector, occupation or skills analysis where selected.
6. Key findings/recommendations only if supplied by a defined deterministic rule or approved analysis service; clearly distinguish observed evidence and interpretation.
7. Sources, metric definitions, coverage, uncertainty and limitations.
8. Optional data appendix / tables.

## Print CSS requirements

Use `@page` for page size/margins; `@media print` to hide app chrome; `break-before`/`break-after` only for intended boundaries; `break-inside: avoid` for compact cards, small charts and short callouts; avoid fixed-height document panels. Allow long tables and long prose to flow naturally. Keep colour/contrast strong enough in grayscale. Validate in Chromium print output with more than one page and a long table.

## Security and correctness

- Render text through React/text nodes; do not interpolate untrusted HTML.
- A report is a snapshot: include its selected period, template version, data snapshot/version and provenance.
- Do not turn absent sections into fabricated content. Omit them with a reason or include a documented unavailable note.
- Do not invent source dates, metrics, current status, forecast accuracy or citations.
