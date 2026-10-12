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

## First walkthrough

1. Open Station; passengers are moving at 07:24 WIB. Select a shop or unit in the scene; the inspector uses the same model as the people.
2. Place a shop: choose one of four categories, size and orientation; select a feasible unit or bounded planning-court slot; confirm. Occupied/undersized/disallowed units cannot be placed. Move/remove uses the same constraints.
3. Add a staff, weather, train or route event with a magnitude and time window. Undo/redo restores the complete plan. Reset is reversible and does not delete saved plans.
4. Scrub the shared hour, pause or change speed. Switch baseline/proposed/stress or open Scenarios for a common-window comparison.
5. Visit Overview, Tenants, Staffing and Campaigns. Plan a campaign, preview on/off, save, edit, duplicate or archive it.
6. Switch to Tenant for hypothetical location shortlists or a chosen business's operating results. Tenant reports suppress other tenants' individual settings/results. This switch is a presentation workflow, not production authentication.
7. Save/reopen locally or import/export JSON. CSV and print use the active model/window. Storage failures preserve the working plan; export a copy.
8. Toggle EN/ID. Phones load a lightweight scene-derived illustration and analytical summary instead of the desktop Three.js renderer. A copied link opens the bundled morning preset; it does not transmit custom private plans.

## Model and controls

The authored horizon is 07:00–08:00 WIB. `x,z` are horizontal metres and `y` is elevation. A deterministic ledger computes anonymous arrivals, reachable routes, one competing shop choice, FIFO service, purchases, patience and departures. Daily occupancy is prorated over 24 hours; wages follow the modeled opening/worker interval. Contribution includes goods, labor, occupancy and campaign cost; it is not corporate net profit. See [MODEL.md](docs/MODEL.md), [RECONSTRUCTION.md](docs/RECONSTRUCTION.md) and [SOURCES.md](docs/SOURCES.md).

Mouse orbit/pan/zoom, named camera presets and reset are available. Scene keyboard controls are documented in [scene README](src/scene/README.md). Every commercial unit also has DOM controls for selection/placement. Escape cancels the active transient layer; Ctrl/Cmd-Z and Shift-Z provide undo/redo outside text fields. Reduced-motion starts paused.

## Deliverables

`deliverables/brand/` includes the 16-slide editable brand guide, matching PDF and original vector/PNG/favicon logo archive. Public brand assets are original; raw owner screenshots and historical context are excluded. Brand applications are source-verified specification diagrams and an original scene projection, not captured browser screenshots.

## Verification boundaries

See [VERIFICATION.md](docs/VERIFICATION.md) for test/build/benchmark evidence and the browser limitation. The available browser rejected local preview access; no browser workaround or account publication was used. WebGL appearance, live pointer/keyboard/responsive interactions, GPU resource stability and 60 FPS on an 8 GB integrated-graphics laptop remain unverified. The guide's requested actual application screenshot pages are replaced by clearly described application specifications. The mobile preview is derived from original scene geometry rather than a captured desktop frame.

Run the packaged browser test plan on a permitted local browser before a competition presentation or external deployment. Model tests and compilation cannot certify those visual requirements.
