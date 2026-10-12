# Reproducible station model

`src/simulation/engine.ts` exports `simulate(scenario)`, `compareScenarios(scenario,start,end)`, and `createStressScenario(scenario)`. The engine imports station configuration and domain contracts. It imports no React, WebGL, or Three.js code. Rendering quality, camera, floor visibility, and frame rate cannot alter analytical outcomes.

## Authored horizon and demand

The scenario clock runs from 07:00 to 08:00 Asia/Jakarta: 0–3,600 simulated seconds. All report and intervention windows are half-open `[start,end)`. A snapshot at `t` represents the instant just before `t`; its people stock therefore equals arrivals before `t` minus departures before `t`, exactly matching `metrics(0,t)`. Stock in a period report is the station stock at its end, not that period's arrival count.

Background demand uses 1,200 three-second candidate slots, with keyed 0.65 inclusion and sub-slot jitter. Six authored trains arrive at seconds 240, 840, 1,440, 2,040, 2,640, and 3,240, alternating platforms. Each train brings 65–85 modeled alighting people spread across 48 seconds, with 60-second dwell. The engine and import/planning validator share `src/domain/trainSchedule.ts`: same-platform trains must allow 40 seconds of approach plus 35 seconds of departure clearance. Concurrent trains on different platforms remain valid and appear together in `snapshot.trains`; the legacy single-train field retains the first active train. These are demonstrator inputs, not a KAI timetable or measured passenger volumes. The morning horizon deliberately supersedes the pack's example evening schedule.

People are anonymous agents with no names, inferred income, demographic profile, or personal targeting. A keyed hash of seed, semantic identity, and purpose produces demand, walking speed, journey, buying choice, service variability, basket, and patience. Adding a shop or changing staff does not consume or reshuffle an arrival RNG stream. Added train events have a separate identity namespace so an event named `train-1` cannot duplicate the default train's passenger IDs.

## Movement and access

The authored route graph uses hall floor `y=1`, platforms `y=0`, and the footbridge `y=2.65`. The public spine lies at `z=-2.8`, between west/east entries `x=-28/+28`. Ticketed journeys cross the gate and stairs at the eastern connection. The far platform uses the visible footbridge at `x=26`: platform stair base `(21.4,0,8.8)` → bridge `(26,2.65,8.8)` → `(26,2.65,18.5)` → far stair base `(21.4,0,18.5)`. Nobody walks across ground-level rails.

Shortest graph paths are cached by origin, destination, and closure state. The central edge has a valid lower concourse bypass at `z=4.2`; the central commercial bay remains reachable. Node arrival recalculates closure state before the next edge. A person already on an edge finishes that edge; the closure does not teleport them. The renderer and engine consume the same `shopTransform` from `src/domain/shopGeometry.ts`, using planning's single footprint table. Cardinal shop entrances use cached obstacle visibility detours around occupied shop walls. Entry crosses the actual door line; browsing and service remain inside that rendered footprint, with transitional approaches represented as walking. Queue formation follows the local rotated storefront in at most two shallow serpentine rows, with columns based on its width, keeping even an 18-person large-shop queue clear of the public spine. Collision avoidance does not use pairwise crowd checks.

Background journeys either cross the hall or reach a platform to board. Boarding agents wait for a matching train departure only if they have reached its platform in time. After the last available train they wait briefly and leave the modeled platform edge; the model does not assert they boarded an absent train. Detailed journeys are retained in the ledger even when the renderer shows a smaller visual sample.

## Shops and queues

A normal journey creates only reachable, open, visible shop opportunities. Attraction depends on category configuration, unit fit, route distance, available journey dwell, and nearby same-category substitutes. Alternatives compete for one possible visit per journey. The probability of shopping is bounded at 0.58, so adding shops cannot generate unlimited buyers. Current queue load reduces acceptance at the door. Shop size limits queue space: 8, 12, or 18 waiting people.

An entered visit has a stable visit ID, entry, browsing, queue join, service start/end or abandonment, purchase decision, and exit. Queue order is FIFO. Worker count determines simultaneous service capacity. Service duration varies from 0.75–1.25 times the configured category mean. Preparation/restock task fraction increases the effective time required between served customers. Service workers already handling an order finish it when a staffing reduction begins; reduced capacity blocks new orders until active work falls below the new count. This is a non-preemptive service discipline.

Queue patience varies around category configuration. A full queue or expired patience creates a completed abandoned visit, without a transaction. Purchase probability after completed service is 0.90; a campaign does not override it. Basket values vary 0.8–1.2 around the configured basket and are rounded to integer hundreds of rupiah. Advanced tenant overrides for `basket`, `serviceSeconds`, `margin`, and `occupancyPerDay` replace their category/unit defaults.

## Interventions and campaigns

| Type | Meaning |
|---|---|
| Arrival | Add `magnitude` people at the chosen platform. Train dwell is bounded to 60–240 seconds; alighting is spread through the requested event duration or actual train dwell, whichever is shorter, so nobody appears after that train leaves. |
| Delay | Add `magnitude` seconds to default train arrivals whose original arrival falls in the event window; optional target `train-1`…`train-6`. |
| Rain | Intensity 0–1 slows outdoor approach movement and pulls hall movement toward the sheltered side. |
| Route closure | Close the known central concourse edge and use its reachable bypass; canonical target `central-route`. |
| Tenant closure | A closure targeting a tenant blocks new entries and new service in that interval. |
| Staff | Signed worker change: −1 absence or +1 additional cover, targeting a tenant; capacity never falls below zero. |
| Campaign | Change a named tenant's bounded awareness/entry weight when its screen is visible along the journey and the campaign is active. |

Campaign lift is budget-dependent and saturates; spend per active hour contributes up to 0.65 lift. Objective coefficients are 1 for visits, 0.55 for awareness, and 0.8 for purchases. Purchases targets only dwell-qualified eligible entries; the purchase decision itself remains the same keyed 0.90 probability and can fail. Combined lift is capped at 0.75. Campaign spending allocates the configured budget evenly over its active window, once. Archived campaigns have no effect, cost, or tenant exposure attribution. Screen exposure counts a distinct agent–screen first route encounter. Visibility clips each actual trajectory segment against the screen's modeled radius; qualified exposure requires two visible seconds inside the report window and, for tenant attribution, the active campaign window. Neither metric claims proven attention or an audited advertising impression.

Comparison baseline is the authored opening plan with the user's seed. Proposed is an isolated copy of the selected plan. Stress preserves proposed changes and adds a 180-person arrival wave, one absent coffee worker at 07:20–07:30, and rain intensity 0.6 during that ten-minute interval. The wave prefers 07:20–07:22:30 on the first platform, selects the other platform or nearest available slot if necessary, and respects the same train-clearance validator. A completely occupied timetable merges additional passengers into an existing authored arrival up to its 1,500-person limit; a timetable with no remaining capacity retains its existing demand and applies the staffing/weather disruption. `createStressScenario` supplies exactly the world shown for the stress branch. It replaces its own prior stress event IDs rather than stacking duplicate stress conditions.

## Metrics and money

Times in configuration, event ledgers, and trajectories are **seconds**. Report `waitMean`, `waitP90`, `dwellMean`, and `workload` are **minutes**. Entry/conversion/coverage are **ratios**, not pre-multiplied percentages. Money is **integer IDR**.

Sales sum actual purchasing-event baskets in the report window. Gross margin sums each transaction's rounded basket × configured margin. Labor integrates paid scheduled worker-seconds across opening hours and staff events, then applies the category hourly wage. Rent uses an explicit 24-hour allocation: configured daily occupancy × report seconds ÷ 86,400. Campaign cost uses budget overlap. Cumulative rounding at boundaries makes cost totals additive across adjacent report windows. Contribution is exactly gross margin minus labor, occupancy, and campaign cost. It is operating contribution with these configured costs, not corporate net profit or landlord rent revenue.

Passing is distinct people with an eligible first storefront opportunity in the interval. There is at most one visit per agent. Entry rate uses entered people whose passing opportunity is also in the interval, divided by that passing cohort; this prevents arbitrary window cuts from generating rates above 100%. Completed conversion uses the completed-exit cohort, excluding unfinished visits. Transactions and sales retain purchase-event timestamps, which can precede that visit's final exit. Wait statistics include service starts in the interval and exclude abandonment; dwell uses finalized exits. Queue length is the stock at report end, equal to the matching snapshot.

Workload is actual raw service work overlapping the report plus configured required preparation/restock minutes. Coverage is paid available worker-minutes divided by required workload; it may exceed 1 when there is spare capacity. A zero workload returns 0 coverage; zero passing or completed visits returns `null` entry/conversion so the UI displays a missing denominator, never success at zero demand.

## Replay, memory, and checks

Simulation precomputes a deterministic event ledger and compact trajectory segments. Seeking reconstructs positions by binary search within each active agent's segments, without replaying thousands of frame steps. Metrics and 12 five-minute chart buckets use the same visit/purchase/arrival data. Analytical counts are unweighted exact model agents. The result cache retains at most six scenarios; each result caches at most 32 report queries. Captured scenarios are deeply frozen, so consumer edits cannot change cached outcomes.

`npm test` includes substantive checks for non-empty demand, independent reproducibility, conservation, bounded coordinates, additive report totals, financial arithmetic, zero denominators, capacity/absence, underused staffing costs, arrival and delay timing, closure reachability, rain movement, campaign windows, archive behavior, branch isolation, unique person IDs, continuous shop movement, and wall avoidance under cardinal rotations. The suite first ran red against the empty engine, then added red regressions for physical route and immutability defects before their fixes.

Run `node --import tsx tools/benchmark.ts` (also `npm run benchmark` when configured) to measure cold simulation, stress, 1,000 random seeks, report queries, bounded-cache memory, and conservation. The benchmark prints the actual host and Node runtime. These are CPU/model measurements; browser software rendering cannot establish the 60 FPS target on the specified 8 GB integrated-graphics laptop. Real-device GPU profiling remains a separate delivery check.
