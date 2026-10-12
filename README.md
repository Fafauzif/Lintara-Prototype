# Lintara 1.2

Lintara connects passenger movement, commercial spaces, staffing and campaigns in one station workspace. Operators can compare a plan before committing space and operating costs. Proposed tenants can inspect a business case with clear inputs, costs, break-even and alternatives. Sudirman is an authored station reconstruction; movement and financial results are simulation assumptions, not measured KAI/KRL traffic or verified leases.

## Run

Requires Node 22.12 or newer; Node 24 is used for this handoff.

```sh
npm ci
npm run dev
```

For a production build:

```sh
npm test
npm run check:showcase
npm run check:commands
npm run check:pages
npm run build
npm run preview
```

## First demonstration

1. **Quality is beside Operator / Tenant in the header.** Lite, Standard (the original rendering baseline) and High change rendering detail, while representing the same modeled people. The header also has a labeled **Next train** button, available while the desktop workspace scrolls.
2. The simulation command bar comes before the scene. Play/Pause, Next train, Replay arrival and Add arrival have visible labels. Morning rush, Lunch hour and Evening rush presets choose 07, 12 and 17. Start hour selects any one-hour window from 05:00–06:00 through 22:00–23:00; Jump to time accepts the exact clock time, including seconds. The scrubber and timetable follow that hour.
3. Hour changes alter authored traffic volume, boarding/alighting mix, category preferences and passenger patience. They retain the plan's relative shop, event and campaign windows. Normal / Busy / Legacy remain separate demand assumptions; explicit user-added train counts remain as entered.
4. Hall is the close default camera. Use Hall / Platforms / Whole station, or switch to the live 2D map. Phones begin in 2D; WebGL errors also switch to it. Every modeled floor-eligible passenger remains represented.
5. Drag a shop card into a legal unit to place it in one action. Tap/click a category and then a listed/map unit also works. R rotates, Escape cancels, and Undo reverses the placement. Moving retains business identity and inputs.
6. Open **Business opportunity** from the labeled navigation, station demo route, tenant business page or shop inspector. Review hourly sales, contribution after costs, break-even, service capacity and the busiest five-minute windows. Edit basket, margin, wage, purchase probability and occupancy assumptions, then Apply. Cautious / Base / Upside are deterministic sensitivities with explicitly shown inputs.
7. Choose **Find an opportunity** to compare 1–4 workers in the current and legal vacant units. The finder preserves neighboring shops and demand, offers a positive result only when the model finds one, and applies it as one undoable change. Tenant mode exposes only the selected business's individual finances. Download or print its brief for a tenant conversation.
8. Open **Scenarios** to compare Baseline, Proposed and Stress. Impact cards and table cells explain more/fewer, higher/lower, shorter/longer and no change. Cost and wait reductions can be favorable; lower sales or contribution remain visible. Stress text describes the actual interventions that fit the plan.
9. Save/open locally, or export/import JSON. Reports include the selected hour and demand assumptions. Roles are presentation workflows, not production authentication. Storage failures preserve the working plan; export a copy.

See [DEMO_GUIDE.md](docs/DEMO_GUIDE.md) for a short judge/tenant walkthrough and a reproducible staffing example.

## Model

The engine retains a deterministic one-hour ledger, using relative seconds 0–3,600. Missing hour/period fields preserve the exact prior 07:00 baseline. Daily occupancy is prorated over a 24-hour calendar day; wages follow modeled worker time. Contribution includes goods, labor, occupancy and campaigns; it is not corporate net profit. One rush hour is never multiplied into a daily or monthly revenue forecast. See [MODEL.md](docs/MODEL.md), [REVISION_1_2.md](docs/REVISION_1_2.md), [GRAPHICS.md](docs/GRAPHICS.md) and [SOURCES.md](docs/SOURCES.md).

## Deploy to Vercel

Use this directory as the source, with package.json at its root. Import the repository into Vercel, select Vite, build with `npm run build`, and use `dist` as output. No secrets, account credentials or backend are required. Included vercel.json preserves SPA links. This ZIP is updated source; no account was registered or deployment performed during this revision.

## Included design assets

`deliverables/brand/` contains the unchanged 16-slide editable identity guide, matching PDF and vector/PNG/favicon logo archive. Its application diagrams are identity specifications from the original guide, not v1.2 browser screenshots. The source-derived Hall illustration is an original CPU projection; the runtime 2D map is live and uses the shared simulation.

## Verification limits

[VERIFICATION.md](docs/VERIFICATION.md) records fresh package checks. Unit tests, controlled component callbacks and server-rendered markup are source/model evidence. They do not verify actual browser focus, pointer/touch gestures, responsive pixels, WebGL appearance or real-device GPU/FPS. The available browser disabled WebGL and local preview access was blocked; neither limitation was bypassed. Run [BROWSER_TEST_PLAN.md](docs/BROWSER_TEST_PLAN.md) in a permitted browser before the live demonstration.
