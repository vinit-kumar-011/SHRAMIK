# SHRAMIK Landing Page Specification

**Route:** /  
**Audience:** Public-sector planners, skilling institutions, researchers and partners  
**Scope:** Public landing page; no backend requirement for the first design pass.

## Purpose
Explain what SHRAMIK is, what labour-market intelligence it provides, and how it can support better-informed skilling decisions. It is not a job portal.

## Global design
Follow docs/frontend/SHRAMIK_GLOBAL_DESIGN_SYSTEM.md. Use the approved warm off-white canvas, subtle dot texture, bold condensed heading typography, dark outlines, selective offset shadows and restrained yellow/navy/orange/teal accents. Use relevant documentary-style Indian workforce/city imagery sparingly.

## Section order and approved copy

### 1. Header
SHRAMIK wordmark + “Labour Market Intelligence System”. Links: Overview, Capabilities, Methodology, About. Primary action: “Explore the platform” only if it leads to a meaningful implemented destination. On mobile use an accessible collapsible menu.

### 2. Hero
Eyebrow: “LABOUR MARKET INTELLIGENCE SYSTEM”

Headline: “Connect workforce skills with the needs of the labour market.”

Supporting copy: “SHRAMIK is a decision-support platform designed to bring labour-demand signals, workforce supply and emerging skill requirements into a connected view—helping planners examine skill gaps, explore future trends and evaluate skilling priorities.”

Primary CTA: “Explore capabilities” — scrolls to capabilities.  
Secondary CTA: “View platform preview” — scrolls to preview.

Supporting line: “Evidence-led insights. Traceable data. Better-informed skilling decisions.”

Create an illustrative dashboard preview from UI components. Label it visibly “PLATFORM PREVIEW · ILLUSTRATIVE DATA”. No invented official statistics or fake live status.

### 3. Capabilities
Heading: “From labour-market signals to actionable intelligence.”

Six cards:
1. Labour Demand Intelligence — explore demand signals across sectors, occupations, skills and locations.
2. Workforce Supply Intelligence — examine relevant workforce and skilling-capacity indicators where reliable data exists.
3. Skill Gap Analysis — compare projected demand and supply to identify potential shortages, surpluses and mismatches.
4. Forecasts & Early Warnings — examine future trends and configured risk signals.
5. Emerging Skills Intelligence — explore skills showing rising demand and their relationships to occupations/sectors.
6. Scenario Simulation — compare hypothetical skilling interventions against a baseline.

Cards are keyboard-accessible. Hover changes border/shadow subtly and moves the arrow slightly. Every link has a meaningful destination.

### 4. Workflow
Heading: “One connected workflow. Five stages of intelligence.”
1. Gather signals.
2. Harmonise the data.
3. Estimate demand and supply.
4. Identify gaps and emerging needs.
5. Evaluate possible interventions.

Selectable stages update explanatory text. On mobile, use a vertical sequence. Add a short note that results depend on source coverage, data quality, mapping choices and forecast assumptions.

### 5. Users and use cases
Heading: “Make skilling decisions with a clearer view of the labour market.”
- Policy & Planning — examine regional patterns and potential workforce shortages.
- Skill Development Institutions — explore training capacity and projected skill requirements.
- Research & Analysis — investigate trends, compare regions/sectors and inspect supporting evidence.

Do not imply that named institutions already use SHRAMIK.

### 6. Evidence and transparency
Heading: “Understand the evidence behind every insight.”
Show four principles: Traceable sources, Transparent methods, Visible uncertainty, Clear provenance. Explain source-backed observations, derived estimates and synthetic demo data distinctly.

CTA: “Explore the methodology”.

### 7. Platform preview
Heading: “See the labour market from more than one angle.”
Selectable views: Overview, Skill gaps, Forecasts. Tabs update local illustrative preview content only. Never present mock data as live.

### 8. Closing CTA
Heading: “Better visibility. More informed skilling decisions.”
Copy: “Explore how labour-market evidence, workforce intelligence and scenario analysis can support more informed planning.”
Actions: “Explore capabilities” and “View methodology”.

### 9. Footer
SHRAMIK description, Platform links, Information links and Access links. Use only approved contact/legal/institutional content. Do not fabricate a sponsoring department or official entity.

## Motion and interactions
- Sticky header with subtle shadow after scrolling.
- In-page anchors with smooth scrolling unless reduced motion is enabled.
- Section reveals: subtle fade + 8–12 px rise, 250–400 ms, once.
- Hero dashboard hotspots can reveal short explanations.
- Capability cards have consistent hover/focus states.
- Workflow stages and preview tabs use local state.
- Do not use scroll-jacking, heavy parallax, cursor trails, constant counters, video backgrounds or perpetual chart movement.

## Responsive behaviour
- Desktop: two-column hero, three-column capabilities grid, horizontal workflow.
- Tablet: compact hero and two-column cards.
- Mobile: text before preview; single-column sections; vertical workflow; stacked CTAs; accessible menu; no horizontal overflow.
- Check 320, 375/390, 768, 1024, 1280, 1440 and 1920 px plus intermediate widths.

## Integrity and accessibility
- No fabricated statistics, testimonials, awards, source coverage, national rankings or endorsements.
- No official emblems or official government affiliation claims without authorization.
- All visible controls must work or have a clear disabled/unavailable state.
- Semantic headings, keyboard operation, visible focus, adequate contrast, image alt text and reduced-motion support.
- Keep mock data isolated; no backend/API required for the first pass.

## Acceptance criteria
- Matches the global design system.
- Uses shared components and tokens.
- All nine sections are present in order.
- Interactive preview and workflow use local state only.
- Mock data is visibly labelled.
- Responsive layout and accessibility states have been checked.
- No broken links, dead controls or unauthorized institutional branding.
- Developer reports files changed, components reused, checks performed and unresolved issues.