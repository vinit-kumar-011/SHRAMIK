# SHRAMIK — Data Sources & Integrations

**Purpose:** Developer handoff for an independently built React/TypeScript Data Sources page. This package is an implementation specification and starter-contract bundle, not a completed page and not evidence that API routes or connectors exist.

## Recommended Claude Free workflow

1. Open the existing SHRAMIK frontend repository/workspace.
2. Send `PROMPTS_FOR_CLAUDE_FREE/01_BUILD_SOURCE_REGISTRY.md` along with `SHRAMIK_DATA_SOURCES_IMPLEMENTATION_SPEC.md`, `SHRAMIK_DATA_SOURCES_SIDEBAR_LOCK.md`, and `SHRAMIK_DATA_SOURCES_COMPONENT_INVENTORY.md`.
3. Ask Claude to inspect the current repo and build only the Data Sources page module. Do not generate a new app or recreate the main shell.
4. Then use `02_SOURCE_DETAILS_AND_OPERATIONS.md` to finish the source details drawer, ingestion history, coverage, and mapping views.
5. Finally use `03_REVIEW_TEST_AND_FIX.md` to audit the result, fix responsive/accessibility issues, and document what is still mocked or not configured.

Alternatively, use `CLAUDE_PROMPT_SHRAMIK_DATA_SOURCES.md` as one complete prompt. If Claude Free loses context, use the staged prompts.

## Package contents

- `reference/SHRAMIK_Data_Sources_Reference.png`: revised target visual for this page.
- `reference/SHRAMIK_Dashboard_Reference.png`: authority for the existing global shell.
- `SHRAMIK_GLOBAL_DESIGN_SYSTEM.md`: canonical shared visual system.
- `SHRAMIK_DATA_SOURCES_IMPLEMENTATION_SPEC.md`: layout, behaviour, responsive rules, states and acceptance criteria.
- `SHRAMIK_DATA_SOURCES_COMPONENT_INVENTORY.md`: component map and responsibilities.
- `SHRAMIK_DATA_SOURCES_API_CONTRACT.md`: proposed backend contract; endpoint names are not proof of implemented APIs.
- `SHRAMIK_DATA_SOURCES_DATA_SEMANTICS.md`: definitions for status, freshness, coverage and provenance.
- `SHRAMIK_DATA_SOURCES_INTEGRATION_CONTRACT.md`: boundary between the page module and the future application shell/backend.
- `SHRAMIK_DATA_SOURCES_SIDEBAR_LOCK.md`: canonical navigation order and shell lock.
- `SHRAMIK_DATA_SOURCES_QA_CHECKLIST.md`: practical completion checklist.
- `BACKEND_ARCHITECTURE_ALIGNMENT.md`: how this module fits the current proposed source-ingestion architecture; additions are labelled as proposals.
- `contracts/`: TypeScript source models and adapter interface examples.
- `examples/mock-data-sources.json`: deterministic fixture for UI development only; every record is `SYNTHETIC_DEMO`.
- `PROMPTS_FOR_CLAUDE_FREE/`: staged prompts designed to work within limited context.

## Read this before implementing

**The visual is a reference, not pixel-perfect instruction.** It contains illustrative source names, dates, status counts, user initials and metadata. Treat all data shown in it as design placeholders. The source fixture included here is explicitly marked `SYNTHETIC_DEMO`; do not remove that label or represent any connector as verified based on a fixture.

The reference image also depicts extra `User Management` and `Settings` sidebar entries. Those are not part of the approved SHRAMIK canonical sidebar. Ignore them. Reuse the existing shared shell and retain the canonical order in `SHRAMIK_DATA_SOURCES_SIDEBAR_LOCK.md`.

Build the page first with a deterministic mock adapter. Keep all source retrieval, credentials, connector secrets, and upstream data access on the server. Do not block frontend implementation while source validation work continues, but do not state or imply that integration status is live or verified until the backend confirms it.

## Current scope / non-goals

First milestone: source registry, search/filters, source-details drawer, recent ingestion history, coverage summary, field-mapping preview, pagination, and realistic loading/empty/error/unconfigured states. Advanced ingestion orchestration, credential management, editing connector credentials, schema migration execution, and production background jobs are not part of the frontend-only milestone unless corresponding backend capabilities are confirmed.
