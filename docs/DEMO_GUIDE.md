# A short judge and tenant demonstration

## The story

“Lintara makes the space between a train arrival and a shop purchase visible. An operator can test how a commercial plan works in the station. A tenant can examine their own costs, capacity and break-even before choosing a location.”

## Ninety-second route

1. **Make the station feel alive, 25 seconds.** Open Station. Point out Quality beside the roles and the Time period / Next train controls in the bottom bar. Choose Morning rush and click Next train to preview an existing arrival without changing the plan. Switch to Evening rush to show how an authored commute-home window changes the opportunity. Click a shop and use Focus shop to inspect its surroundings. Explain that the demand assumptions can be calibrated with station counts.
2. **Show a business decision, 40 seconds.** Open Business → Opportunity for one shop. Read its selected-hour sales, contribution after modeled costs, break-even and capacity. Show the editable basket, margin, wage, purchase probability and occupancy inputs. Compare Cautious / Base / Upside, then use Find an opportunity to test legal units and 1–4 workers. Inspect the actual improvement before applying it. If the search finds no positive alternative, reconsider the inputs or concept rather than promising an uplift.
3. **Explain the return, 25 seconds.** Open Compare → Impact & plans. Show the baseline and proposed outcomes, including extra costs and shorter/longer waits. Explain that the sign describes a change; whether it helps depends on the metric. Finish with the selected business's downloadable opportunity brief, a concrete starting point for a tenant discussion.

For a placement-focused audience, substitute the first shop selection with Add shop → drag a category into an available unit → Undo. Successful placement closes the catalog and returns attention to the station.

## Reproducible positive example

Reset the plan to the default Normal crowd, seed 20261012, 07:00–08:00. Open Kopi Sela (T2, U2). Changing only staff from 2 to 3 produces these selected-hour authored model outcomes:

| Metric | 2 workers | 3 workers |
|---|---:|---:|
| Transactions | 82 | 127 |
| Sales | IDR 2,316,200 | IDR 3,565,100 |
| Labor | IDR 52,000 | IDR 78,000 |
| Contribution after modeled costs | IDR 1,452,525 | IDR 2,250,799 |
| Mean wait | 2.58 min | 2.07 min |
| Abandoned visits | 66 | 38 |

Contribution improves by IDR 798,274 for this business after the extra wage is included. This is a reproducible model example, not observed revenue or a guarantee for every tenant/window. The finder may recommend another tested unit/staff combination with a higher contribution. Other shops can be affected by competition. Station's live sales-so-far indicator will differ from this complete-hour projection before the hour finishes.

## Tenant conversation

“You can see what supports the projection. Enter your planned basket and margin, wage quotation and occupancy cost. Test a cautious and an upside case, check the sales needed to cover costs, and compare a service/location option. A pilot would replace the authored inputs with station counts, service observations and cost quotations.”

Contribution is operating gross margin after modeled labor, occupancy and campaigns, not full company net profit. One rush hour is not a whole trading day. The tenant report contains only the selected business's individual finances; role switching is a prototype workflow, not production authentication.

## Rehearsal

Install from the ZIP and run [BROWSER_TEST_PLAN.md](BROWSER_TEST_PLAN.md) on the actual demonstration device. Verify layout, focus, gestures, train preview, quality switching and brief download/print. Check how Lite performs on the intended lower-power device before choosing the demonstration preset. Delivered source/model checks do not establish browser appearance or GPU/FPS performance.
