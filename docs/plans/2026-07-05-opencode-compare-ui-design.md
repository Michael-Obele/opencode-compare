# OpenCode Compare — Filter Fix + Thermal UI Redesign

**Date:** 2026-07-05
**Status:** approved

## Overview

Fix the broken scenario filters and redesign the OpenCode Compare UI around a single, coherent metaphor: **quota economics as thermal management**. Models run cool (quota-friendly) or hot (burn fast). The page's job is to help developers pick the best economic fit for their task.

## Problem Statement

The current scenario filters in `FilterBar.svelte` map buttons to plain text strings (`competitive`, `agentic`, etc.), and `ModelTable.svelte` does substring matching against model tag labels. Because tags are only generated when models pass high thresholds (e.g., SWE-bench > 50 for Competitive, context ≥ 500K for Agentic), clicking **Competitive** or **Agentic** often returns an empty table.

## Solution: Scenario Fit Scoring

Replace brittle tag matching with **scenario fit scores** (0–100). Every model is scored for every scenario, and the table is sorted by that score when a scenario is active. Results are always useful and never empty.

### Scoring Functions

| Scenario | Scoring Logic |
|---|---|
| **Brainstorming** | reasoning benchmark rank + context window + moderate burn rate |
| **Coding** | coding benchmark rank + SWE-bench / Code Arena + speed |
| **Competitive** | SWE-bench + Code Arena + coding rank (no longer requires the exact tag) |
| **Agentic** | coding rank + context window ≥ 256K + speed + tool support |
| **Budget** | low total price + high requests-per-window |

### Behavior

- All scenario buttons return a non-empty, ranked list.
- Table sorts by fit score descending when a scenario is active.
- Each row displays a **4-segment fit meter** when a scenario is selected.
- Search remains independent and filters by substring within the active scenario.

## Visual Identity: Thermal Management

Drop the blue-purple gradient hero. Use a solid-color "thermal" system to communicate burn rate and fit.

### Palette

| Token | Color | Usage |
|---|---|---|
| Cool / quota-friendly | `cyan-500` | Slow burn badges, low-cost accents |
| Warm / moderate | `amber-500` | Moderate burn badges |
| Hot / fast burn | `red-500` | Fast burn badges, high-cost accents |
| Primary accent | `violet-600` | Active filters, interactive emphasis |
| Background | `bg-background` | Page surface |
| Text | `foreground` / `muted-foreground` | Body and secondary text |

No gradients.

### Typography

Keep the existing Public Sans variable. Tighten the hero to a single strong statement and use a clearer type scale for section headings.

## Component Changes

### `src/lib/server/inference.ts`

- Add a `scenarioScores` field to `GoModel`.
- Implement `inferScenarioScores(...)` returning `{ brainstorming, coding, competitive, agentic, budget }`.
- Normalize each score to 0–100 based on the current model population.

### `src/lib/types/models.ts`

- Extend `GoModel` with:
  ```ts
  scenarioScores: {
    brainstorming: number;
    coding: number;
    competitive: number;
    agentic: number;
    budget: number;
  };
  ```

### `src/lib/components/FilterBar.svelte`

- Replace the search-string mapping with scenario values.
- Emit the active scenario to the parent.
- Use updated icon set:
  - All: `Globe`
  - Brainstorming: `Brain`
  - Coding: `Code`
  - Competitive: `Trophy`
  - Agentic: `Bot`
  - Budget: `Calculator`
- Active chip uses solid `violet-600` background.

### `src/lib/components/ModelTable.svelte`

- Accept `scenario: string` prop.
- Compute `filteredModels` by name/provider/tags substring as before.
- When a scenario is active, sort by `model.scenarioScores[scenario]` descending.
- Render a **4-segment fit meter** in each row when a scenario is active.
- Convert burn cell to a **thermal badge** with a dot + label.
- Improve tabular alignment and empty-state copy.

### `src/lib/components/QuotaCalculator.svelte`

- Tighten layout and apply thermal badges.
- Pre-select the most quota-friendly model by default.
- Replace the number input with a slider for tokens.
- Present cost-per-request + requests-per-window in the same visual language.

### `src/lib/components/ModelDrawer.svelte`

- Header: provider + burn badge + "New" badge.
- Top "thermal summary" line: e.g., "Burns fast — ~3,692 requests per 5h window."
- Prominent, one-tap **Copy model ID** button.
- Group sections with clearer hierarchy:
  1. Pricing
  2. Quota
  3. Benchmarks
  4. Details
  5. Migration hints
- Benchmarks rendered as a bar-chart-style list for easier scanning.
- Sticky bottom action row: Copy ID + Compare on LLM Stats.

### `src/routes/+page.svelte`

- Remove gradient hero text.
- Pass `scenario` into `ModelTable`.
- Update hero metadata pills to use solid icon style.
- Add loading skeleton state.

## Icon Mapping (Lucide)

| Concept | Icon |
|---|---|
| Brainstorming | `Brain` |
| Coding | `Code` |
| Competitive | `Trophy` |
| Agentic | `Bot` |
| Budget | `Calculator` |
| Burn fast | `Flame` |
| Burn slow | `Snowflake` |
| Speed | `Zap` |
| All | `Globe` |

## Error Handling

- API failure keeps a centered error card with a clearer retry message.
- Loading state renders skeleton rows for the table.

## Testing Checklist

- [ ] Each scenario returns 5+ models.
- [ ] Search filters correctly within an active scenario.
- [ ] Table sorting updates when a scenario is selected.
- [ ] Drawer opens, copies model ID, and links to LLM Stats.
- [ ] Burn badges use correct thermal color.
- [ ] `bun check` passes.
- [ ] `bunx prettier --write` applied to edited files.

## Files Modified

- `src/lib/types/models.ts`
- `src/lib/server/inference.ts`
- `src/lib/components/FilterBar.svelte`
- `src/lib/components/ModelTable.svelte`
- `src/lib/components/QuotaCalculator.svelte`
- `src/lib/components/ModelDrawer.svelte`
- `src/routes/+page.svelte`
