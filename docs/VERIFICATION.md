# Revision 1.1 verification

Recorded on 12 October 2026 with Node 24.19.0, Vite 7.3.7 and Vitest 5.0.4. These are source, model, package and controlled CPU drawing checks; they are not browser/WebGL/device acceptance.

## Verified behavior

- 133 unit tests in 10 files passed: conservation, financial windows, campaign effects, privacy/import/persistence/history, actual commercial footprints, protected routes and gate-bank body clearance, train conflicts/playback, full crowd quality/capacity and 2D coordinate/placement checks.
- 15 actual workspace callback checks passed: direct placement, single history action, Undo, invalid preservation, default Hall, graphics independent of demand, Next train seeks/plays without plan mutation, own-business move, forged tenant drop rejection and outside-hour replay guard.
- Analytical checks passed: 16 source callback flows plus 42 server-render privacy/ownership/EN-ID states. Real report escaping/scoping is covered separately by unit tests.
- TypeScript plus the Vite production build passed. Three.js remains a lazy station dependency; a fresh-package asset/import check is recorded below.
- Independent source review found and rechecked fixes for placement R camera reset, mobile map control clipping and outside-hour inspector replay. No critical/high source blocker remained in that review. This is not a production safety/security certification.

## Drawing and graphics evidence

The exact Canvas2D drawing/interaction functions were exercised in a controlled CPU Canvas harness at phone and desktop sizes. All 2,401 supplied fixture agents were submitted at Lite/Standard/High; floor filtering submitted 1,600 hall or 801 platform agents while retaining a model total of 2,401. Paused zoom reused the snapshot; tap/drop, R placement framing and listener/RAF cleanup were checked. These fixture results are not real station measurements, DOM gesture tests or FPS measurements. Original map drawings were visually inspected.

The source-derived close Hall illustration uses the same original geometry and Normal snapshot. It is an original CPU depth-buffer projection, not a WebGL screenshot. The bundled 16-slide identity guide and matching PDF are unchanged; their application specification pages and version-1 illustration are not new revision-1.1 captures.

Every floor-eligible person receives a representation at every graphics level. The 3D pool grows in 512-person chunks and explicitly switches to the available 2D path if more than 32,768 simultaneous eligible people are requested. Visibility/occlusion and the selected floor differ from dropping modeled people. Lite changes geometry/material/resolution/shadows; it does not reduce the modeled population.

## Model performance evidence

`BENCHMARK.json` was regenerated from the revised model. It records the runtime/workload, 12 cold runs, 1,000 seeks, reports, comparison, conservation and retained Node memory. The Normal preset is an authored 1.6× demand assumption; Busy is 2.8×; legacy imports without the field retain legacy demand. Explicit added-arrival passenger counts are not multiplied. Presets and routing are planning assumptions, not calibrated KRL traffic or a pedestrian collision solver.

The CPU benchmark does not establish GPU frame rate, browser frame time or behavior on an 8 GB integrated-graphics laptop. No 60 FPS or universal device-performance claim is made.

## Remaining browser acceptance

The permitted cloud browser could read the hosted version-1 prototype but reported WebGL disabled. Prior local HTTP/file preview attempts were blocked. No browser security workaround, installation, account publication or deployment was used.

Actual final WebGL lighting/framing, pointer/touch drag gestures, responsive DOM layout/focus, live downloads/print, repeated GPU quality/mode cycles and target-device frame times remain unverified. Actual finalized application screenshots remain unavailable. Use `BROWSER_TEST_PLAN.md` in a permitted local browser before demonstration or publication.

## Fresh archive check

Passed from a safely extracted source archive with `package.json`/lockfile at root:

| Command/check | Result |
| --- | --- |
| `npm ci --no-audit --no-fund` | 104 packages installed successfully. |
| `npm test` | 133/133 tests passed in 10 files. |
| `npm run check:workspace` | All 15 workspace callback checks passed. |
| `npm run check:pages` | 16 callback flows and 42 server-render states passed. |
| `npm run build` | TypeScript and Vite production build passed with the same application chunk hashes as the reviewed source. |
| Assets/imports | All 8 checked entry/static references exist. Entry HTML and static entry imports do not preload/import Three.js or StationScene; the only static entry import is the React chunk. |
| Archive | CRC/path/symlink checks passed; 182 files. Source, tests, docs, local assets and unchanged brand deliverables are included; dependencies/build/private references/QA/review records are excluded. |
| Brand consistency | Separate and public guide/logo copies remain byte-identical to the unchanged identity deliverables. |

The tested 181-file content manifest excludes only this completed record. Its SHA-256 is `6eb296bc25ee859b8db82ef1000b059e5a1421e64dc658b98f08809bc14a064a`, computed from sorted UTF-8 `file_sha256  archive_relative_path` lines with a final newline. It identifies the tested source/assets independently of ZIP metadata and this verification record. The final archive was rechecked after completing the record; it is a source handoff, not a hosted deployment or a browser acceptance result.
