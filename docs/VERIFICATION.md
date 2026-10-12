# Lintara 1.2 verification

## Confirmed source/model evidence

- Node 24.19.0; pinned package dependencies unchanged from 1.1.
- 165 unit tests passed in 13 files: ledger/conservation, financial windows, campaigns, persistence/history, footprints/routes/gates, timetable/playback, graphics/crowd/map, selected-hour profiles and validation, business accounting/sensitivity/finder/privacy, signed human-readable impacts and actual stress copy.
- 22 actual workspace/showcase callbacks passed, including direct placement/Undo, own-business move/forged-drop guard, renderer-quality population invariance, header quality presence, transport before scene, changing the selected hour, labeled header Next train without plan mutation, and navigation to Opportunity.
- 54 actual command-bar callbacks/clock-label checks passed across 05/07/08/12/18/22, including exact seconds, endpoint, invalid/blank time preservation, hour presets and labeled next/replay.
- 16 analytical page callback flows and42 server-render privacy/ownership/EN-ID states passed.
- TypeScript and Vite production build passed. Three.js station rendering remains a lazy-loaded chunk; the live 2D path does not mount 3D.
- Source review found no critical/high blockers. Review fixes addressed selected-shop opportunity routing, wage cap, stale search/results and unconditional stress claims.

These checks exercise source behavior and server-rendered markup. They are not browser interaction or pixel verification.

## Model benchmark

BENCHMARK.json contains a fresh renderer-independent default Normal-crowd morning benchmark. On this host, cold model median 174.84ms (12 runs); random-seek median0.148ms, p95 0.368ms (1,000 seeks). Default arrivals 1,955, departures 1,895 and present-at-end 60 conserve exactly. This is CPU/model evidence, not a GPU or device-FPS claim. Other devices and hour/crowd configurations can differ.

The reproducible business example in DEMO_GUIDE.md was recalculated on this source: Kopi Sela 2→3 workers, 07:00–08:00, same default seed/demand and economics; contribution 1,452,525→2,250,799 IDR, mean wait 2.579→2.074min. This is authored simulated evidence, not observed business performance.

## Packaged checks

The final ZIP is extracted to a new directory, installed with npm ci and checked with the same tests, callback commands and build before handoff. Asset references, archive paths/CRC and unchanged brand-file copies are inspected. node_modules, dist, temporary QA, raw user references and internal planning/review notes are excluded. Fresh extraction completed successfully: npm ci installed104 packages; all165 tests passed; 22 workspace/showcase callbacks,54 command callbacks,16 analytical callbacks and42 server-render states passed; TypeScript + Vite build succeeded with the same compiled asset names as the reviewed source. The ZIP CRC and safe paths passed; all94 brand files were byte-identical to the originals.

## Graphics and browser boundary

The 1.1 full-population renderer/Canvas checks remain relevant because the scene implementation is unchanged. Presets submit every floor-eligible person; the 3D capacity limit is explicit and falls back to interactive 2D. The original CPU Hall illustration and identity guide are unchanged and are not 1.2 browser screenshots.

The available cloud browser disabled WebGL, and local browser-preview access was blocked in the earlier session. Neither was bypassed. No real browser/GPU test is claimed for this revision. Actual WebGL appearance, touch/pointer gestures, responsive DOM pixels/focus, downloaded/printed files and real-device frame times remain unverified. Run BROWSER_TEST_PLAN.md on the demonstration device.

No account creation, publication, deployment or Git push was performed.
