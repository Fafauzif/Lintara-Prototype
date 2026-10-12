# Lintara 1.3

Lintara turns station movement into a business plan people can explore. Watch a train arrive, place a shop, then test its location, service capacity and costs before committing space. The station is the main workspace; Business holds the editable business case, and Compare explains what a proposed plan changes. Sudirman is an authored station reconstruction; movement and financial results are simulation assumptions, not measured KAI/KRL traffic or verified leases.

## Run

Requires Node 22.12 or newer; Node 24 is used for this handoff.

```sh
npm ci
npm run dev
```

For a production build:

```sh
npm test
npm run check:workspace
npm run check:showcase
npm run check:commands
npm run check:pages
npm run build
npm run preview
```

## First demonstration

1. **Quality is beside Operator / Tenant in the header.** Open the labeled quality selector for Lite, Standard or High. Standard retains the original rendering baseline. Quality changes rendering detail while representing the same modeled people. Save is also in the header.
2. **Time and Next train are together in the bottom simulation bar.** Time period selects any one-hour window from 05:00–06:00 through 22:00–23:00, including named Morning rush, Lunch hour and Evening rush options at 07, 12 and 17. Current time accepts seconds. Play/Pause, Next train, speed, arrival status and the timeline stay with the workspace. Open More controls for Replay arrival, Add arrival, Start hour and the timetable. Next train previews an existing arrival; Add arrival changes the plan.
3. Hour changes alter authored traffic volume, boarding/alighting mix, category preferences and passenger patience. They retain the plan's relative shop, event and campaign windows. Normal / Busy / Legacy remain separate demand assumptions; explicit user-added train counts remain as entered.
4. Station gives the canvas priority, with compact metrics for the selected instant. Hall is the close default camera; Whole station provides context. Click a shop for a quick summary, then choose Focus shop for a closer view or Business details for its full inspector. Selection alone keeps your camera position. The live 2D map preserves analysis and placement; phones begin in 2D, and WebGL errors switch to it. Every modeled floor-eligible passenger remains represented.
5. Open **Add shop** when you want to place a business. Drag a catalog card into a legal unit to place it in one action, or click a category and then a listed/map unit. The catalog closes after successful placement or cancellation. R rotates, Escape cancels, and Undo reverses the placement. Moving retains business identity and inputs.
6. Open **Business → Opportunity**. Review selected-hour sales, contribution after costs, break-even, service capacity and the busiest five-minute windows. Edit basket, margin, wage, purchase probability and occupancy assumptions, then Apply. Cautious / Base / Upside are deterministic sensitivities with explicitly shown inputs. Operating plan (My business in Tenant mode), locations, staffing and campaigns stay under Business; operators also have Shops.
7. Choose **Find an opportunity** to compare 1–4 workers in the current and legal vacant units. The finder preserves neighboring shops and demand, offers a positive result only when the model finds one, and applies it as one undoable change. Tenant mode exposes only the selected business's individual finances. Download or print its brief for a tenant conversation.
8. Open **Compare → Impact & plans** to compare Baseline, Proposed and Stress. Impact cards and table cells explain more/fewer, higher/lower, shorter/longer and no change. Cost and wait reductions can be favorable; lower sales or contribution remain visible. Stress text describes the actual interventions that fit the plan. Station report contains the full operator analysis.
9. Save/open locally, or export/import JSON. Reports include the selected hour and demand assumptions. Roles are presentation workflows, not production authentication. Storage failures preserve the working plan; export a copy.

See [DEMO_GUIDE.md](docs/DEMO_GUIDE.md) for a short judge/tenant walkthrough and a reproducible staffing example.

## Model

The engine retains a deterministic one-hour ledger, using relative seconds 0–3,600. Missing hour/period fields preserve the exact prior 07:00 baseline. Daily occupancy is prorated over a 24-hour calendar day; wages follow modeled worker time. Contribution includes goods, labor, occupancy and campaigns; it is not corporate net profit. One rush hour is never multiplied into a daily or monthly revenue forecast. Station's compact metrics describe progress so far; a shop's labeled hourly forecast and the Business/Compare pages describe the complete selected window. See [MODEL.md](docs/MODEL.md), [REVISION_1_3.md](docs/REVISION_1_3.md), [GRAPHICS.md](docs/GRAPHICS.md) and [SOURCES.md](docs/SOURCES.md). [REVISION_1_1.md](docs/REVISION_1_1.md) and [REVISION_1_2.md](docs/REVISION_1_2.md) record earlier revisions; their old navigation descriptions are historical.

## Deploy to Vercel

Use this directory as the source, with package.json at its root. Import the repository into Vercel, select Vite, build with `npm run build`, and use `dist` as output. No secrets, account credentials or backend are required. Included vercel.json preserves SPA links. This ZIP is updated source; no account was registered or deployment performed during this revision.

## Included design assets

`deliverables/brand/` contains the unchanged 16-slide editable identity guide, matching PDF and vector/PNG/favicon logo archive. Its application diagrams are identity specifications from the original guide, not screenshots of the revised application. The source-derived Hall illustration is an original CPU projection; the runtime 2D map is live and uses the shared simulation.

## Verification limits

[VERIFICATION.md](docs/VERIFICATION.md) records fresh package checks. Unit tests, controlled component callbacks and server-rendered markup are source/model evidence. They do not verify actual browser focus, pointer/touch gestures, responsive pixels, WebGL appearance or real-device GPU/FPS. The available browser disabled WebGL and local preview access was blocked; neither limitation was bypassed. Run [BROWSER_TEST_PLAN.md](docs/BROWSER_TEST_PLAN.md) in a permitted browser before the live demonstration.
