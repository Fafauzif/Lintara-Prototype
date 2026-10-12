# Lintara 1.3 verification

## Executed source checks

- Node 24.19.0; React/Three/Zustand/Vite dependencies remain pinned and unchanged. Project version is 1.3.0.
- 188 unit tests passed across 14 files. Existing engine, financial, period, planning, persistence, crowd, quality, map and opportunity checks remain; new camera framing covers wide/4:3/portrait sizes, finite size guards and preserved map pan/relative zoom. Playback markup tests reflect one primary Next train and bounded advanced disclosure.
- 51 actual revised workspace callbacks passed: direct placement/Undo, invalid-drop history protection, ownership and forged payload guards, header quality/demand invariance, bottom dock ordering, hour/preview plan preservation, grouped navigation, intent-only catalog, quick summary and explicit details/focus, Top down preservation, elapsed financial labels, obsolete focus clearing and placement Undo preserving earlier edits. The separate inherited workspace command also passed 15 checks already covered in this suite.
- 86 actual transport callback/label checks passed: EN/ID, all 18 hour choices, exact seconds and endpoint parsing, invalid-time guards, preview/replay, added arrivals, timetable markers, outside-hour protection and Escape closing advanced controls.
- 16 analytical callback flows and 42 privacy/ownership/language server-render states passed.
- TypeScript and Vite production build passed. Three.js remains lazy-loaded, and the 2D path does not mount the WebGL scene. All four shell/dock stylesheets parsed with PostCSS.
- Independent behavior and broad source/CSS reviews found no remaining P0/P1/P2 after fixes for Top down access, forecast versus elapsed labels, historical focus payloads, stale placement Undo, mobile Add shop visibility, scrollable catalog Close, panel stacking, narrow bilingual labels and long shop-name wrapping.

These are executed source, geometry, controlled callback and server-render checks. They do not establish browser interaction or pixel layout.

## Model and assets

The simulation/economics code is unchanged from v1.2. BENCHMARK.json retains the earlier renderer-independent morning model benchmark: cold median 174.84 ms, random seek median 0.148 ms/p95 0.368 ms; 1,955 arrivals, 1,895 departures and 60 people present at the end. This is prior CPU/model evidence, not a fresh GPU or device-FPS benchmark. The reproducible DEMO_GUIDE staffing example retains the same deterministic model inputs.

All 94 original brand files were byte-identical to v1.2 source. Identity guides and the CPU station illustration remain original specifications/illustrations, not revised browser captures.

## Package verification

The delivery source excludes node_modules, dist, build caches, user uploads and internal process/review notes. A new extraction installed 104 packages using npm ci with the existing offline cache. All 188 unit tests, 51 revised workspace callbacks, 86 transport checks, 16 analytical flows, 42 privacy/language server-render states and the production build passed. Every packaged file except this final verification note matches the tested extraction byte-for-byte. The final archive has 201 unique safe entries, a valid CRC, no symlinks/dependency/build-cache directories, and all 94 unchanged brand files. Documentation links resolve. Source and fresh extraction produced the same compiled asset names: index-CMhvykN-.css, index-BPHOxgyy.js, StationScene-BfxNakVD.js, react-OvXVS5lI.js and world-34Xs-2dW.js.

## Browser boundary

The available cloud browser disabled WebGL, and local browser-preview access was blocked earlier. These restrictions were not bypassed. Actual responsive DOM pixels, focus/gesture behavior, WebGL composition, download/print UI and real-device GPU/FPS remain unverified. The CSS review is source-based; camera framing is tested geometry, not a rendered WebGL capture. Use BROWSER_TEST_PLAN.md for the target-device rehearsal.

No account creation, deployment or Git push was performed.
