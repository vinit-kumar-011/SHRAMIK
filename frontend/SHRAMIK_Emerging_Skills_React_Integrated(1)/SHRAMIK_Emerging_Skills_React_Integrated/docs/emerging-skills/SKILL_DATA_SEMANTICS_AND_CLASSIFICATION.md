# Skill data semantics and classification rules

## 1. Scope and status

These are proposed frontend/backend coordination rules for the Emerging Skills feature. Category labels and numerical thresholds must be agreed with the analytics owner and returned by the backend. The UI must not silently define or invent the statistical method.

## 2. Canonical skill identity

- Every skill shown as a distinct entity should use a stable `skillId` and canonical display name.
- Source-specific terms/aliases must map to the canonical skill with method, review status and confidence where meaningful.
- Preserve source terminology and mapping lineage. Do not automatically merge terms just because they appear semantically similar.
- A canonical skill can be associated with multiple occupations and sectors, and a given occupation/sector can relate to multiple skills.

## 3. Category semantics

Use category codes, labels, rule version and evaluation output from the backend:

- `EMERGING`: newly appearing or newly qualifying demand signal according to documented rules and minimum evidence gates.
- `ACCELERATING`: sustained growth exceeds a declared reference/benchmark over a declared window.
- `ESTABLISHED`: sustained, adequate evidence of demand meeting the approved rule.
- `DECLINING`: sustained decline according to an approved rule; one weak period is insufficient by itself.
- `UNCLASSIFIED`: insufficient or incomparable evidence, where applicable.

Do not set thresholds in React. The profile must expose the category rule version, observation window, measures passed, measures not available, coverage requirements and limitations.

## 4. Distinguish metrics

Never conflate:
- job postings with unique vacancies or actual hires;
- skill mentions with people possessing that skill;
- volume with growth rate;
- absolute count with index/rate;
- newly observed source coverage with genuinely new skill demand;
- mapping confidence with forecast confidence or data coverage.

Every metric has a definition, unit, population/grain, observation window and aggregation rule. Percent change is undefined when the baseline is zero or unsuitable; handle via an approved alternative rather than division-by-zero or a made-up percentage.

## 5. Network graph semantics

Every graph edge declares its basis:
- `DIRECT_OBSERVATION` — observed co-occurrence/mention evidence with defined grain/window;
- `APPROVED_MAPPING` — an approved reference crosswalk or reviewed mapping;
- `DERIVED_ASSOCIATION` — computed association from explicit data and a documented method.

Do not imply that a transitive path is a direct relationship. Avoid treating sector links inferred from occupation membership as direct posting evidence. Return evidence counts, methodology/mapping version and quality metadata where possible. The frontend should distinguish these bases through labels and line styles, not just colour.

## 6. Coverage and provenance

Recommended provenance states: `SOURCE_BACKED`, `DERIVED`, `MIXED`, `SYNTHETIC_DEMO`. If multiple states contribute, mark `MIXED` and describe the composition. Quality should include at least approved/caution/suppressed/unsupported/not-comparable or the backend's established equivalent.

Coverage is not a probability and should not be shown as a confidence percentage unless it truly is one. “Insufficient coverage” must be distinct from zero and from “no skill exists”.

## 7. Compare semantics

Compare 2–4 canonical skills. Numerical differences are shown only when metric definitions, unit, period, geography and coverage are compatible. Otherwise show side-by-side values plus a clear not-comparable reason. Keep each skill's classification rule and provenance visible.

## 8. Watchlist and alerts

Persist watchlist items/rules per authenticated user. Alert conditions must reference a supported metric and an explicit threshold/window. Every alert should expose trigger, rule version, period, evidence and limitations. Do not promise push/email delivery unless implemented by the backend.
