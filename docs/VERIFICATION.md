# Verification record

Verified on **12 October 2026**. The source compiles and the automated model, configuration and source-level interface checks pass. Live browser behavior and the required final application captures remain unverified or unmet as described below.

## Automated checks

| Check | Recorded result | Scope |
| --- | --- | --- |
| `npm test` | **61/61 tests passed**, 6 files, Vitest **5.0.4** | Deterministic replay; people conservation; route/gate/level connectivity; shop lifecycle; queue/service capacity; protected queue geometry; train waves, delays and platform conflicts; campaign objectives; period-aligned money/ratios; placement/import validation; persistence/history; chart timestamps; seeded branch isolation. |
| `npm run build` | TypeScript and Vite **7.3.7** production build passed | Supported pinned application code and local production chunks. This does not establish WebGL initialization or a served deployment. |
| `npm run check:pages` | **16 callback-flow checks** and **42 server-render privacy/ownership/language states** passed | Analytical-page campaign, staffing and location actions; scoped report arguments; tenant/missing-owner rendering; EN/ID source output. The checker is explicitly not a browser, DOM interaction, focus or screenshot test. |
| Dependency audit | Final `npm audit` reported **0 vulnerabilities** | Package dependency audit at the recorded revision; separate from application/browser behavior. |

Node **24.19.0** was used. The pinned Vite and Vitest versions support the documented Node 22.12 / 24 targets; Node 24 is recommended for the deployment handoff.

Concrete regressions checked include a long added train wave finishing its alighting within dwell, browsing/service inside the same footprint used by the renderer, stress queues kept clear of the through-route, and imported demand seeds shared by rendered baseline and analytical comparison. The seed-42 branch reproduction gives **1,236 arrivals** for baseline world, baseline report and proposed demand. At seed 0 and time zero, both snapshot and metric stock are **0**. These are authored-model results, not observed Sudirman operating data.

## Assets and brand artifacts

- Runtime source uses local app-origin assets and no external runtime font, CDN model or image dependency. The Three.js scene is a lazy component; the phone branch returns its dedicated preview without mounting the desktop renderer. Actual phone network requests remain a browser check.
- The final PPTX has **16 slides**, editable text on every slide, no external relationships and no corrupt ZIP member in the structural check. The matching PDF has **16 pages** with selectable text.
- All 16 guide page designs were visually inspected; revised pages **8, 10 and 13** were re-inspected after the final export. Logo variants, palette, clear space, typography and usage examples are consistent. Structural checks supplement layout inspection; no claim is made that the files were opened in Microsoft PowerPoint.
- The station preview is an original CPU depth-buffer projection using the same source geometry and model snapshot. It is clearly documented as an illustration, **not a browser screenshot**. Guide application pages use clearly identified specifications and editable diagrams.

## Performance evidence

`BENCHMARK.json` contains a machine-readable renderer-independent benchmark. `tools/benchmark.ts` records Node/platform/CPU, authored model configuration, cold simulation timing, random seeks, reports, comparison, people conservation and Node process memory. Its measurements apply to that runtime and workload only.

This evidence does **not** establish WebGL frame rate, GPU memory, browser main-thread responsiveness or performance on the requested 8 GB laptop with integrated graphics. No 60 FPS claim is made. The renderer uses shared resources and pooled instances, representative crowd limits and reduced resolution options, but those implementation choices still require real-device profiling.

## Browser and capture limits

The permitted browser rejected the local HTTP preview and local-file navigation. No alternative browser route, proxy, account publication or security-policy workaround was used.

The following requirements remain unverified:

- WebGL initialization, lighting, viewport composition, camera feel and live pointer/touch/keyboard interaction.
- Actual laptop, tablet and phone layout; zoom/overflow behavior; modal focus/escape; clipboard, download, print and WebGL recovery flows in a browser.
- Repeated renderer/floor/placement/reset cycles, GPU resource stability and real frame-time measurements.
- Served SPA path reloads, deployed asset requests and a hosted Vercel deployment. Production configuration and compilation are available, but no account was deployed.

**Acceptance requirement A31 remains unmet:** actual captures of the finalized desktop station, shop detail, tenant/prospective view and phone application were not obtained. The original scene illustration and guide specification diagrams explain the implemented source but do not satisfy this screenshot requirement. Source tests and compilation cannot clear that gap.

Run [BROWSER_TEST_PLAN.md](BROWSER_TEST_PLAN.md) in a permitted local browser before a competition demonstration or external publication. Record actual results and replace the guide's application specifications with real captures when those checks pass.

## Fresh-extraction package check

**Passed on 12 October 2026.** `Lintara_Project.zip` was CRC-checked and safely extracted into a new directory with `package.json`, its pinned lockfile and Vite/Vercel configuration at archive root.

| Fresh-extraction command/check | Result |
| --- | --- |
| `npm ci --no-audit --no-fund` | Passed: 104 packages installed from the pinned lockfile. An earlier install with lifecycle scripts disabled also passed. |
| `npm test` | 61/61 passed in 6 files. |
| `npm run check:pages` | 16 callback-flow checks and 42 server-render states passed. |
| `npm run build` | TypeScript and Vite 7.3.7 production build passed; application chunk names matched the tested working tree. |
| Local production assets | HTML script/style references, favicon, primary logo, brand PDF download and both station-preview assets exist in `dist`. No Three.js world or station-renderer preload appears in the entry HTML. |
| Brand byte consistency | Guide PPTX/PDF and logo ZIP match byte-for-byte across `deliverables/brand`, `public/brand` and the separate delivery files. The public download PDF matches the guide PDF. |
| ZIP integrity and exclusions | No corrupt member, absolute/traversal path or symlink. Dependencies, build output, temporary QA files, raw supplied references and internal review records are excluded. |

The validated 163-file source/asset manifest excludes only this verification document, which was completed after the checks. Its SHA-256 is `ee3108d6b5198308b0ddd11a61aaa60f314bfe434ff4a1d500c7a242e9b82956`. It is the SHA-256 of sorted UTF-8 lines `file_sha256  archive_relative_path`, with a final newline. This identifies the tested contents independently of ZIP metadata and the verification record; it is not the archive-file checksum. The final archive contains 164 files and was rechecked after completing this record.

These packaging checks validate installation, compilation and bundled files. They do not change the browser, real-device performance or capture limits above. Optional brand/illustration authoring scripts require the original artifact/image tooling; they are not application dependencies and are not invoked by `npm ci` or Vite.
