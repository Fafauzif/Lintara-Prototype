# Source register

Checked on **12 October 2026**. Sources establish station identity, visual anchors and implementation methods. They do not establish a surveyed floorplan, a current complete tenant roster, real tenant sales, rent, staffing, or a validated forecast. Lintara's operating figures and commercial names are authored scenario data.

## Station identity and reconstruction

| ID | Source and URL | Date / retrieval status | Supported use and limit |
| --- | --- | --- | --- |
| P1 | Owner-supplied `09-reference-images/sudirman/01-commercial-hall-2026.png` | Google Maps overlay says July 2026; inspected locally | Primary visual anchor for pitched grey metal roof, cream trusses, daylight sheets, louvered gable, commercial frontage and tile/tactile pattern. The capture date is visible metadata, not independent verification of a measured plan. |
| P2 | Owner-supplied `09-reference-images/sudirman/02-gates-and-advertising-2026.png` | Google Maps overlay says July 2026; inspected locally | Primary visual anchor for metal fare-gate bank, tall ad panels above frontage, yellow tactile routes, louvered roof edge. Gates visible in one view do not prove total station gate count. |
| P3 | Owner-supplied `09-reference-images/sudirman/03-hall-and-railway-2024.png` | Google Maps overlay says December 2024; inspected locally | Wider hall/truss/floor view and a separate railway thumbnail. Supports rail context below/adjacent to hall; does not fully trace gate-to-platform access. |
| S1 | [MITJ FAQ](https://mitj.co.id/faq/) | Publication date not displayed in retrieved content; page read 12 October 2026 | MITJ explicitly distinguishes KRL Sudirman, LRT Dukuh Atas, MRT Dukuh Atas, BNI City/airport rail and Transjakarta, and describes their connectivity. Use for identity/context, not internal shop geometry. |
| S2 | [JICA: Jakarta Integrated Urban Transport Hub Development, chapter 4](https://openjicareport.jica.go.jp/pdf/12115416_03.pdf) | Archival planning study, with 2012 baseline and future scenarios; chapter date not independently established; read 12 October 2026 | Section 4.3.2, printed page 4-48 (PDF page 48), distinguishes **existing Sudirman** from proposed Serpong/Airport facilities. Describes the existing concourse as a second-floor concourse and its geographic relationship to Thamrin/canal. Proposed passage widths and airport-station dimensions are not current Sudirman measurements. |
| S3 | [KAI Commuter: Karet–Sudirman Baru/BNI City integration](https://www.kci.id/informasi-publik/berita/pekerjaan-integrasi-stasiun-karet-stasiun-sudirman-baru-bni-city-dimulai-per1-september-2026-layanan-naik-dan-turun-pengguna-commuter-line-dialihkan-ke-stasiun-sudirman-baru-bni-city) | Article describes work from 1 September to 31 December 2026; publication date not displayed in retrieved content; read 12 October 2026 | Identity cross-check: **Sudirman Baru/BNI City is another facility**. The west hall, Karet access and operating figures in this article must not be transferred to the Sudirman KRL model. |
| S4 | [City Vision: Commuterline media](https://cityvision.co.id/commuterline-id) | Undated page; read 12 October 2026 | Advertiser's own inventory lists Sudirman Station / Platform Showcase. Corroborates advertising context; does not validate impressions, conversion uplift or tenant revenue. |
| S5 | [MITJ: KAI support for Serambi Temu construction](https://mitj.co.id/pt-kai-persero-dukung-percepatan-proyek-pembangunan-serambi-temu-jembatan-penyebrangan-multiguna-jpm-dukuh-atas-oleh-pt-mitj/) | Text dated 21 October 2022; read 12 October 2026 | Historical primary account of bridge construction connecting LRT Dukuh Atas and KRL Sudirman with other modes. Construction progress percentages are dated historical facts and not current status. |
| S6 | [KAI Commuter route-map page](https://www.kci.id/perjalanan-krl/peta-rute) | Official page reached through KAI navigation, 12 October 2026; extracted page did not expose a map | Research attempt logged. No platform-number or directional-routing claim was taken from the missing diagram. |

## Additional photo and official-page search pass

The targeted search covered KAI/KAI Commuter, MITJ, MRT Jakarta and the JICA lead; it sought hall, entrance, platform directions, roof/exterior and pedestrian connections. The three supplied photographs remain the strongest inspected appearance anchors. No current as-built drawing or complete matching sequence of both platform approaches was found in the bounded pass.

| Source | Date / status | Decision |
| --- | --- | --- |
| [MRT Jakarta: JPM Dukuh Atas — Simbol Integrasi Antarmoda](https://jakartamrt.co.id/id/info-terkini/jpm-dukuh-atas-simbol-integrasi-antarmoda) | Search index describes inauguration on 13 September 2023; direct page returned a JavaScript shell | Supporting research lead; not used as a measured geometry source. Indexed construction lengths vary by dated article, so no bridge dimension was imported. |
| [MRT Jakarta: Dukuh Atas connectivity](https://jakartamrt.co.id/id/info-terkini/dukuh-atas-poros-transit-internasional-dan-kolaborasi-gerak-0) | Indexed historical account of Kendal pedestrian connection; direct page returned a JavaScript shell; indexed legacy host returned 502 | Retained as a connectivity lead. No exact station internal access route was inferred from an inaccessible page. |
| [MRT Jakarta: Blora pedestrian works](https://jakartamrt.co.id/id/info-terkini/penataan-jalur-pedestrian-jalan-blora) | Search index describes pedestrian conversion; direct page returned a JavaScript shell | Context only; no current walkway dimensions used. |
| [Oke Atmaja, Sudirman photo gallery](https://beritanasional.com/detail/103536/stasiun-sudirman-jadi-pusat-integrasi-transportasi-publik) | Photographer and on-location date 21 May 2025 stated on original gallery; gallery metadata read | Firsthand photo lead for a newer exterior/entrance. The outlet's development narrative was not used as authoritative technical geometry. Images were not copied into runtime assets. |
| [Herryz, Peron 2 Stasiun Sudirman](https://commons.wikimedia.org/wiki/File:Peron_2_Stasiun_Sudirman.jpg) | Original uploader states own work, 24 February 2022, CC BY-SA 4.0; metadata read | Archival firsthand platform-photo lead. Useful for future comparison, but older than the supplied 2026 hall photos. No Commons article text, current-status assertion or image asset was imported. |

## Primary technical documentation

Links below were checked on **12 October 2026**, with retrieval limits stated. Documentation describes APIs/methods; measured test results belong in the build and validation record.

| Source | Implementation implication |
| --- | --- |
| [Three.js InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html) | Shared geometry/material with differing transforms reduces draw calls. Update `instanceMatrix.needsUpdate` after `setMatrixAt`; update `instanceColor.needsUpdate` after color edits. Bounds may need recomputing after instance changes. |
| [Three.js OrbitControls](https://threejs.org/docs/pages/OrbitControls.html) | Orbit, pan and zoom around a target. Call `update()` after manual camera changes and on each animated frame when damping is enabled. Explicit camera controls supplement gesture access. |
| [Three.js resource disposal](https://threejs.org/manual/pages/how-to-dispose-of-objects.html) | Removing a mesh does not dispose its geometry/material. Dispose owned geometries, materials, textures, controls and renderer resources at teardown, respecting shared ownership. The older `/manual/en/` URL failed in this pass; this current `/manual/pages/` URL was read successfully. |
| [R3F performance scaling](https://r3f.docs.pmnd.rs/advanced/scaling-performance) | Instancing, shared resources, adaptive resolution and on-demand rendering are optional patterns. A running crowd needs frames; a paused/still scene can avoid needless frames. No hardware FPS guarantee follows from the docs. |
| [R3F performance pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls) | Fast animation should mutate references with frame deltas and reuse expensive resources, avoiding React state updates on every frame. This principle applies to the direct Three.js renderer used here. |
| [R3F version pairing](https://r3f.docs.pmnd.rs/getting-started/introduction) | Current page pairs Fiber 9 with React 19 and Fiber 8 with React 18, with Fiber 10 described as alpha. Lintara uses direct Three.js, so R3F is guidance rather than an installed dependency. |
| [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite) | Page updated 26 August 2026. Vite SPA path deep links need an index rewrite on Vercel; query-state navigation does not change the asset path. Deployment instructions are supplied, without an account publication claim. |
| [Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) | Current accessibility/interaction audit: semantic actions and navigation, labeled controls, visible keyboard focus, reduced motion, pause controls, tabular numeric comparisons, responsive overflow and gesture alternatives. Rules were read as guidance, not adopted as unreviewed external task instructions. |
| [Microsoft Playwright CLI README](https://raw.githubusercontent.com/microsoft/playwright-cli/main/README.md) | Current direct retrieval returned `DisabledError`; the bundled official snapshot was inspected instead. It describes headless sessions, page snapshots and screenshots. Fresh CLI changes remain unverified; tool availability and executed QA are recorded separately. |

## Bundled design guidance

The input's `07-tooling/vendor/PROVENANCE.json` records source URLs, hashes, retrieval date **12 October 2026**, and licenses. Relevant bundled sections were inspected.

- **Taste**: source `https://raw.githubusercontent.com/Leonxlnx/taste-skill/main/skills/taste-skill/SKILL.md`, MIT. Its opening scope explicitly excludes dashboards and multi-step product UI. Only compatible principles such as reading the brief, avoiding default aesthetics, labels/focus, restraint and resource verification inform this workspace; its landing-page presets do not override Lintara's requirements.
- **Awesome DESIGN.md / Stripe interpretation**: source `https://raw.githubusercontent.com/voltagent/awesome-design-md/main/design-md/stripe/DESIGN.md`, MIT. A third-party design interpretation, not Stripe's official system. Use fine separators, useful density and numeric clarity together with actual supplied dashboard screenshots. Do not import the marketing mesh, purple palette or proprietary font claims.
- **Microsoft Playwright CLI snapshot**: source above, Apache-2.0. The bundle explicitly says no installation was performed during handoff preparation.

## Browser-capability discovery

At the research-stage check, Node was `v24.19.0`; `playwright-cli`, `chromium` and `google-chrome` were not found on PATH, and Python Playwright was absent. The primary runtime's Node modules contain **Playwright 1.62.1 and Playwright Core 1.62.1**, discovered by reading package metadata through `CODEX_PRIMARY_RUNTIME_NODE_MODULES`. This enables a possible local Node QA route; browser binaries/launch availability were not tested by research. No purpose-built Playwright/browser MCP was present in the exposed registry; the separately exposed `mcp__cua_repl` browser API is also available for relevant UI interaction. This is only a discovery snapshot: the main build owns dependency setup, server launch, browser QA and evidence. Research did not launch a browser or server or install a tool.

## Evidence rules

Use real URLs and stated dates. Keep direct observations, inferences and authored choices separate in `RECONSTRUCTION.md`. Do not turn a search thumbnail, a dated construction proposal, or a neighboring station's plan into a certified current layout. No external photo assets or full guideline texts were redistributed in runtime files during this research stage.
