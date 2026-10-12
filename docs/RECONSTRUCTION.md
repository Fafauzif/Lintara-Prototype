# Sudirman reconstruction brief

**Selected facility:** Sudirman KRL / Commuter Line. Sudirman Baru / BNI City, MRT Dukuh Atas BNI and LRT Dukuh Atas are distinct neighboring facilities. This scene is a recognizable, internally coherent commercial-station reconstruction for scenario exploration, not an architectural survey or an as-built replica.

Research cutoff: **12 October 2026**. Source IDs refer to `SOURCES.md`. The owner authorized reconstruction from matching evidence, triangulation where evidence is incomplete, and an authored coherent fallback. The aspiration to preserve recognizable character is not a measured percentage.

## Observed anchors

These observations come from direct inspection of the three owner-supplied screenshots, with their visible Google Maps dates retained. They establish appearance in those views, not measurements or a full live roster.

| Feature | Evidence | Confidence | Representation choice |
| --- | --- | --- | --- |
| Pitched corrugated grey roof | P1/P2/P3: visible roof slopes and ridge | High for visual character | Keep a pitched silhouette; permit a cutaway/hidden roof to reveal activity. |
| Pale triangulated trusses and repeated cross-bracing | P1/P2/P3: cream members across hall | High | Repeated light trusses carry the recognizable roof rhythm. Repetition count and section sizes are authored. |
| Amber daylight sheets in roof | P1/P2/P3: rectangular translucent roof patches | High | Simplified warm daylight panels, without expensive physically simulated glazing. |
| Louvered gable and high wall openings | P1/P2/P3: horizontal daylight slats | High | Preserve a light ventilated upper edge; avoid a sealed glass-terminal appearance. |
| Light square tile floor and dark bands | P1/P2/P3: glossy pale tiles, straight darker inset strips | High | Bright tiled hall with dark pattern bands. Tile size and specular response are authored. |
| Yellow tactile paths and turns | P1/P2/P3: yellow lines, some corner/junction plates | High for presence, low for complete network | Keep a connected legible path through circulation; exact route endpoints are reconstructed. |
| Shopfront strip and varied retail typologies | P1 and P3: convenience-store, bakery/cake and food frontage; P2: shuttered storefront | High for visible typologies | Original fictional tenants with varied storefront widths and category props. No real brand logos, live stock or real sales are implied. |
| Waist-height metal fare-gate bank | P2: row of electronic gates with green indicators | High for presence | Put gate crossing between public circulation and paid transfer. Gate count and capacity are authored. |
| Long advertising surfaces above frontage | P2: broad ad panels; P1/P3: commercial fascia | High | Large legible authored campaign panels, so exposure areas can be understood spatially. |
| Rail/train context below or adjacent to hall | P3: separate thumbnail showing train, tracks and platform roofs | Medium: relation visible only partly | Two track/side-platform relationships and coherent vertical connections in the explanatory model; precise spatial orientation remains inferred. |

## Historical and external corroboration

- **Identity/connectivity:** MITJ FAQ (S1) names KRL Sudirman separately from LRT, MRT and BNI City and explains multimodal connections. The neighboring modes can appear as subdued context rather than replacing the main station.
- **Vertical relationship:** JICA's archival section on *existing Sudirman* (S2, printed 4-48 / PDF page 48) refers to the station's second-floor concourse. This supports the broad hall-above-rail relationship. The study's proposed walkways do not establish today's exact stair alignment or clearance.
- **Advertising:** City Vision's own list (S4) places Platform Showcase media at Sudirman. It corroborates media context only; it provides no sales or campaign-response evidence.
- **Current neighboring changes:** the KAI Commuter 2026 integration notice (S3) concerns Karet and **Sudirman Baru/BNI City**. Its west hall, route access and passenger counts are excluded from Sudirman geometry and scenario calibration.
- **Additional physical-photo search:** an on-location May 2025 exterior gallery and a February 2022 original platform photograph were found and their dates/authorship checked. They remain recorded comparison leads; they were not copied as assets or used to assert exact current geometry. Current official MRT pages were found but returned JavaScript shells; legacy URLs returned 502. No complete matching current station floorplan was obtained.

## Inferred relationships

The photo sequences suggest a commercial hall with shopfronts at its edges, an open circulation center and gates connecting onward to rail access. Repeated trusses suggest modular bays. Roof/gable lighting supports a pale, bright hall. Rail context plus the historical concourse description supports a lower platform/track relationship.

These relationships guide the model. They do **not** establish geographic orientation for every shop, complete paid/unpaid boundaries, a current gate count, or the exact sequence of all entrances. The renderer's x/z axes are a working scene coordinate system, not surveyed geographic bearings.

## Authored geometry and operating data

The fixture is a schematic, metric working model. The commercial hall is `y = 1` and the platform/rail level is `y = 0` in the shared data contract. These are model levels, not a claim that Sudirman's actual vertical separation is one meter. Physical dimensions, level separation in views, stair runs, storefront polygons, queue envelopes, exits, gate capacity, train spacing and sandbox bounds are authored to keep routes and planning coherent.

Tenants, prices, rent, staff assignments, visitors, purchasing propensity, campaign effects, service times and financial outcomes are authored demonstration assumptions. Data can be compared across scenarios because the engine applies the same explicit assumptions; sources here do not turn those outputs into real Sudirman forecasts.

The working representation must preserve:

1. A connected public approach → hall → fare gate → vertical connection → platform path.
2. Shop entrances/frontage that face walkable circulation, with queues kept out of stairs, doors, gates, rails and safety edges.
3. A central route through the hall and a bounded planning area.
4. Separate lower railway context without importing BNI City's or an MRT station's interior.
5. Simple authored signs, people, shops and train forms that remain readable in the bright miniature view.

## Evidence conflicts and deliberate simplifications

| Gap / conflict | Chosen handling | Reason |
| --- | --- | --- |
| No current complete surveyed floorplan | Authored coherent fixture with stable semantic IDs | Keeps the simulation and selection logic reviewable; a future better source can change geometry without changing object identity. |
| Both complete platform approaches and gate-to-stair sequence not traced in current matched photos | Connect two side-platform relationships schematically through explicit vertical routes | Route continuity is visible and testable, while precision is not falsely claimed. |
| Archival study mixes existing Sudirman and proposed adjacent airport/Serpong plans | Use only the clearly titled existing-Sudirman passage | Prevents accidental station substitution and reversed upper-track/lower-concourse geometry. |
| Bridge lengths differ between older indexed official articles | Do not import an exact JPM length | External bridge is context, not necessary measured scene geometry. |
| Real commercial labels appear in owner references | Original fictional tenants and campaigns | Preserves category/frontage rhythm without implying current tenancy or operational affiliation. |
| Full roof would hide the workspace | Cutaway/roof visibility control while preserving silhouette and truss language | Makes tenants, crowds, queues and connections readable. |
| Glossy photo surfaces and fine construction details are costly to reproduce | Reused materials, reduced mesh detail, instanced repeating elements | Supports the requested accessible miniature character; actual performance is verified separately. |

## Reconstruction review

Compare hall and overview camera views with P1–P3 for pitched roof/truss language, louvers/daylight, storefront rhythm, pale floor/dark bands/tactile routes and gates/ads. Check that rail access remains coherent when floors are hidden or selected. Do not report a fabricated fidelity score or claim survey accuracy. Record actual final screenshot and route-check findings in the build/QA record.
