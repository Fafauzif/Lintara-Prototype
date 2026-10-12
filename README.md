# Lintara

Lintara connects passenger movement, commercial spaces, staffing and campaigns in one station workspace. The opening world is Sudirman KRL; the geometry is a coherent authored reconstruction anchored in supplied station photographs and documented sources.

## Run

Requires Node 22.12 or newer (Node 24 used for this handoff).

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. For a production build:

```sh
npm test
npm run build
npm run preview
```

## Deploy to Vercel

Upload this directory as a GitHub repository with `package.json` at its root. Import the repository into Vercel, select Vite, use `npm run build` and `dist`. No environment secrets, database, account credentials or backend are needed. The included `vercel.json` preserves SPA links and static assets. No account was registered or deployed during this handoff.

## Revision 1.1

The default close Hall camera and one-step shop dock replace the distant overview workflow. Graphics quality is separate from passenger demand: Lite, Standard (original render baseline) and High all render every floor-eligible modeled passenger. See [GRAPHICS.md](docs/GRAPHICS.md) for the exact settings and explicit overflow fallback.

## First walkthrough

1. Open Station at 07:24:20 WIB. Hall is the close default; use Hall / Platforms / Whole station to change framing. Select a shop, unit or train for its details.
2. Drag a shop category from the always-visible dock into a valid unit. One green ghost follows the target; red feedback explains an invalid target. Release places the shop directly. Clicking a card and then a listed/map unit also works. R rotates; Escape cancels. Undo reverses one complete placement. Move preserves the existing business identity and inputs.
3. Use Play/Pause, Next train or Replay arrival. Preview seeks before approach and plays without changing the plan. Expand Train timetable to inspect both platforms, scheduled/added trains and interventions.
4. Add arrival opens an ordinary clock-time form. Choose alighting passengers and platform; Earliest available shows the safe slot. Schedule and play creates a validated arrival, selects the platform camera and plays it. Add event also exposes delay, rain, route closure and staff changes.
5. Choose Lite / Standard / High for graphics. Choose Normal / Busy / Legacy separately for authored demand assumptions. Normal is 1.6× and Busy is 2.8× legacy background/scheduled-train demand; explicit added-train passenger counts stay as entered. These presets are not observed Sudirman traffic. Comparison branches share the chosen assumption and seed.
6. Choose 2D for an interactive lightweight map. Phones start in 2D; WebGL failures switch to it. It supports live passengers, tap/click selection, placement, pan/pinch/zoom and keyboard unit selection. Desktop 3D remains lazy; using 2D does not mount it.
7. Visit Overview, Tenants, Staffing, Campaigns and Scenarios. Switch Tenant for your selected business, its location options and operating results. Own-shop moves remain available; tenant outputs suppress other businesses' individual inputs and money. Roles are a presentation workflow, not production authentication.
8. Save/reopen locally or import/export JSON. CSV and print include the active demand assumption. Toggle EN/ID. Storage failures preserve the working plan; export a copy.

## Model and controls

The authored horizon is 07:00–08:00 WIB. `x,z` are horizontal metres and `y` is elevation. A deterministic ledger computes anonymous arrivals, reachable routes, one competing shop choice, FIFO service, purchases, patience and departures. Daily occupancy is prorated over 24 hours; wages follow the modeled opening/worker interval. Contribution includes goods, labor, occupancy and campaign cost; it is not corporate net profit. See [MODEL.md](docs/MODEL.md), [RECONSTRUCTION.md](docs/RECONSTRUCTION.md) and [SOURCES.md](docs/SOURCES.md).

Mouse orbit/pan/zoom, named camera presets and reset are available. Scene keyboard controls are documented in [scene README](src/scene/README.md). Every commercial unit also has DOM controls for selection/placement. Escape cancels the active transient layer; Ctrl/Cmd-Z and Shift-Z provide undo/redo outside text fields. Reduced-motion starts paused.

## Deliverables

`deliverables/brand/` includes the 16-slide editable brand guide, matching PDF and original vector/PNG/favicon logo archive. Public brand assets are original; raw owner screenshots and historical context are excluded. Brand applications are source-verified specification diagrams and an original scene projection, not captured browser screenshots.

## Verification boundaries

See [VERIFICATION.md](docs/VERIFICATION.md) for fresh test/build/benchmark evidence. Automated source callbacks and controlled CPU Canvas checks are not browser interaction tests. The available cloud browser disabled WebGL; local browser-preview access was blocked and was not bypassed. Actual WebGL appearance, pointer/touch behavior, responsive DOM layout, GPU stability and device FPS remain unverified.

The bundled identity guide remains the original 16-slide guide: its application diagrams and illustration are specifications, not current browser captures. The source-derived close Hall illustration is an original CPU projection. The implemented 2D map is live and uses the same passenger model.

Run the packaged browser test plan in a permitted local browser before demonstration or external publication. No account was deployed during this revision.
