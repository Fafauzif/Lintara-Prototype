# Architecture

The application is a static Vite/React client. It needs no backend, credentials, account sign-in or remote assets. English/Indonesian dictionaries share formatting for IDR and the fixed WIB hour.

- `domain/types.ts`, `data/station.ts`: typed scenario/entities, original geometry parameters, unit constraints, category economics and baseline fixtures.
- `domain/planning.ts`, `shopGeometry.ts`, `trainSchedule.ts`, `branches.ts`: schema validation, immutable placements, shared renderer/model shop transforms, safe platform schedules and aligned branch demand.
- `simulation/`: deterministic renderer-independent event ledger, routed segments, finite train arrivals, FIFO service/patience, campaign visibility and costs. Snapshots reconstruct a chosen instant; metrics use explicit windows and the same events. Cached immutable results and query results are bounded.
- `state/workspace.ts`: Zustand history with detached snapshots, bounded undo/redo and recoverable reset. `state/persistence.ts`: versioned local storage with corruption/quota/denial handling. Import leaves the active plan intact on failure.
- `scene/`: one Three.js world and instanced passengers; slow configuration updates rebuild relevant original assets; the mutable shared clock controls fast motion. Two platforms render independent trains. Repeated geometries/materials are shared and managed disposal keeps replacement/unmount ownership explicit.
- `app/`, `components/`: station shell and seven analytical views. Baseline/proposed/stress visualization applies to the station; analytical pages return to the editable proposed plan and compute aligned comparisons explicitly. Tenant pages/export functions scope private business metrics and inputs to the chosen fictional shop.
- `reports/`: current-model JSON, CSV and isolated bilingual printable reports; escaping, formula-cell neutralization and URL revocation. JSON scenario imports and own business reports are distinct artifacts.
- `public/brand/`: original vector identity, PNG/favicon exports and guides. `public/station-preview.*`: original CPU projection of the same scene builders, explicitly an illustration. Phone layout conditionally avoids importing the desktop scene/world chunks.
- `tools/verify-pages.cjs`: controlled hook/callback and React server-render checks, not a DOM/browser harness. `tools/benchmark.ts`: Node model timing/memory, not GPU/FPS evidence.

Rendering uses real frame delta; model time is held in a mutable clock; DOM updates are throttled. Pause/seek do not make agents advance independently; seeking pauses to retain the selected instant. Camera movement is independent of model pause. Hidden tab/host rendering is suspended. Balanced DPR is 1, low 0.75 and high capped at 1.5; representation quality does not reduce analytical counts. Live WebGL/GPU stability remains unverified in this execution environment.

Sources, authored assumptions and measurement limits are recorded in the accompanying model/reconstruction/verification documents. The role switch provides presentation confidentiality only; it does not claim production authentication. Future live ingestion can replace authored fixtures behind the typed interfaces.

## Revision 1.1

`SimulationControls` and `domain/playback.ts` expose timetable preview and safe arrival slots. `ShopDock` commits validated placement through one history action. `SceneProps` serves both the lazy WebGL scene and the no-WebGL `StationMap`; `mapProjection.ts` uses the shared commercial geometry. Quality helpers change geometry/material/resolution/shadows independently of the optional `Scenario.crowd` environment assumption. Renderer errors switch to live 2D rather than duplicating a static fallback. Snapshot caches are bounded and frozen; no frame-level passenger React components exist.
