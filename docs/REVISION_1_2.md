# Lintara 1.2

## Visible workflow

Quality is adjacent to role selection in the header, rather than inside the layer menu. The header's Next train button previews the next approach without changing the plan. The command bar above the station and analytical pages exposes playback, arrival creation, selected-hour presets, exact clock seeking and a timetable. Plan saving, history and branch selection remain in a separate footer. Navigation labels are visible by default; the close Hall, direct placement, full-population instancing and live 2D device fallback remain.

## Selected-hour model

A scenario may include `startHour` (integer 5–22) and `period` (`morning`, `midday`, `evening`). Missing values preserve morning 07:00 behavior. An explicit contradictory hour/period is rejected. Hours 5–10 are morning, 11–15 midday and 16–22 evening. `setScenarioHour` derives the matching period, cloning shop/events/campaigns and retaining relative seconds. Reports, branches and comparisons carry the same hour, period, crowd and seed.

These are authored factors, not measured station statistics:

| Profile | Background | Scheduled alighting | Boarding share | Bakery | Coffee | Meals | Retail | Patience |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Morning | 1 | 1 | .32 | 1 | 1 | 1 | 1 | 1 |
| Midday | .70 | .65 | .18 | .65 | .85 | 1.65 | 1.10 | 1.15 |
| Evening | 1.08 | .95 | .56 | .80 | .90 | 1.35 | 1.25 | .90 |

Hourly shape multiplies background and scheduled alighting demand: 05=.35, 06=.72, 07=1, 08=1.22, 09=.86, 10=.62, 11=.84, 12=1, 13=.95, 14=.80, 15=.85, 16=.88, 17=1, 18=1.20, 19=.82, 20=.60, 21=.38, 22=.24. Normal/Busy crowd factors combine with this shape. Six relative train stops remain. Explicit user-added arrival counts stay exact. The source of these assumptions is `src/domain/period.ts`.

## Business opportunity

Optional tenant wagePerHour (0–1,000,000 IDR) and purchaseProbability (0–1) supplement basket, service, margin and occupancy overrides. Omission preserves the original category wage and .90 conditional purchase probability. Actual conversion also reflects abandonment and reporting boundaries.

The base projection uses the exact selected-hour ledger. Cautious uses basket ×.85 and purchase probability minus .10; Upside uses basket ×1.15 and probability plus .05, capped at 1. They share traffic, seed, service, staffing, margin and costs. Break-even uses actual ledger gross margin where available, with an explicit input-based fallback. Zero/nonpositive gross revenue or margin does not fabricate a finite break-even. Service capacity is an approximate upper estimate after worker windows and preparation; it is not achieved sales.

The opportunity finder tries current/vacant legal units and 1–4 workers, preserving all other shops and demand. Its comparison is tenant contribution; it does not promise a station-wide improvement or exhaustive optimum. Results include actual signed changes, no-uplift fallback, and cancellation when a search becomes obsolete. Apply commits one plan; Undo remains available. Download/print is selected-business only.

## Clear impact

Localized cards and table explanations use absolute direction and desirability separately: lower wait/cost can improve service/costs, while lower sales/contribution remain unfavorable. Zero is neutral. Wait change uses seconds instead of tiny rounded minutes. Actual stress additions are described; no absent-worker claim is made for a no-coffee plan.

## Scope

No new dependencies, backend, account creation or deployment. The original identity guide and logo masters remain unchanged. These are estimates for one selected hour; no daily/monthly sales extrapolation or real station-data claim is made. Real browser/GPU verification remains separate.
