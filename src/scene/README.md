# Station surface

`StationScene` is the default export of `StationScene.tsx` and consumes the shared `SceneProps` contract. The host must supply a nonzero height. Props are read through a ref and may change without reconstructing the renderer. `clock.current` is the sole timeline input.

The application opens the commercial hall in a closer orthographic three-quarter view, at roughly 35° elevation. Hall, Platforms, Whole station and Top down presets remain available. The default roof is off and cutaway is on; the roof, wall transparency, flow and route layers remain independently controlled.

Selection uses stable tenant IDs and vacant unit IDs, gate `G1`, trains `TRAIN1` / `TRAIN2`, hall zone `ZHALL`, platform zones `ZPLATFORM1` / `ZPLATFORM2`, and screen IDs `AD1` / `AD2` / `AD3`. Tenant locations are cleared and rebuilt on shop changes, so removed shops do not leave a selection ring and moved shops refresh their location and ring size.

## Direct placement

Click a shop card, then click a valid commercial unit, or drag a card onto that unit. `onPlace(unitId, category?)` requests the application’s committing transaction after authoritative `canPlace` validation; there is no separate confirmation step. Drag-and-drop reads the supported category from `text/plain` at release. Optional `placementSize`, `rotation` and `movingId` determine the exact footprint; moving keeps the original shop until a valid commit.

One translucent shop ghost is visible at the hovered or selected target. It snaps to the shared `shopTransform` pose and is green for a valid target or red for an invalid commercial unit. While the pointer is over a protected surface, no old selected-unit ghost remains. `onPlacementHover` reports the unit’s validation reason; outside commercial units it reports `{unitId:'protected-area', valid:false, reason:'Place the shop inside an available commercial unit.'}`. Invalid targets never call `onPlace`.

Orbit, automatic focus and camera reset are suspended while placing or moving. Damping is drained without moving the frame. The first completed placement frame also suppresses automatic focus, preserving the planning camera after a drop. Normal navigation resumes afterward. Canvas controls otherwise support drag orbit, right-drag pan, scroll/pinch zoom, arrow-key pan, +/- zoom and R reset. The application uses R for quarter-turn placement rotation and Escape to cancel.

## Shared geometry and timeline

The authored hall is at y=1, the rail/platform level at y=0; the main circulation spine is z=-2.8; fare gates sit near x10,z4 and stairs near x8,z6. Commercial coordinates come from shared data. Storefront footprints are small 3×2, medium 4×3 and large 6×4 metres, with frontage alignment and quarter-turn orientation. These are demonstration dimensions, not surveyed measurements.

Rendering and simulation consume the same `shopTransform` pose/front/inside helper. Fare-gate lane x12 and the elevated transfer footbridge remain clear of modeled walkers. Static wayfinding, vacancy labels, shop slogans, canvas accessibility copy and active/default ad copy update with EN/ID language. Campaign archive, timing, creative and tenant category affect the same screen surface.

When a snapshot supplies its optional `trains` array, platform 0 uses `TRAIN1` and platform 1 uses `TRAIN2`. The groups share geometry/material ownership, while doors and poses follow their own approach/dwell/departure phase. Missing platform entries hide that train. Legacy snapshots retain the original single `train` field/group; the second group starts hidden. A second rendered train does not itself create passengers or alter demand.

## Crowd and quality contract

Lite, Standard and High submit every agent eligible for the selected floor, in snapshot identity order. Quality never samples people or changes model demand, queues or financial metrics. `all` includes the full snapshot; `hall` includes z<5.15 and `platform` includes z≥5.15. These are floor filters, not graphics limits.

Bodies, heads and the optional heat layer use shared instanced meshes. Capacity starts at 512 and grows in 512-person chunks without shrinking each frame. The explicit 3D limit is 32,768 eligible people at once. Exceeding it throws a descriptive `onError`; the application switches to interactive 2D rather than silently truncating the crowd. Standard preserves the prior lit passenger material, capsule/head detail, DPR ceiling 1 and 1024 shadow map. Lite reduces resolution, mesh detail and passenger lighting and disables shadows. High increases passenger segments, resolution and the static shadow map. Compatibility values remain `low`, `balanced` and `high` respectively.

See [GRAPHICS.md](../../docs/GRAPHICS.md) for exact presets, count datasets and verification limits.

## Update and resource ownership

An unchanged simulation result and clock time reuse the same snapshot. Unchanged paused crowd transforms and colors are not uploaded again; clothing colors upload only when slot identity/color changes or a pool is rebuilt. Once props, camera damping and tweens settle, the renderer skips GPU draw calls. A lightweight RAF watcher remains active so mutable-clock playback, seeks, controls, placement, resize and visibility can wake the view. Host/document hiding suspends that loop. This is not a claim of zero paused CPU work.

Repeated static geometry is merged by shared material. Pool replacement disposes old instanced resources; tenant assets are disposed on plan changes. Owned geometry, materials, textures, shadows, controls and renderer are disposed on unmount. Reduced-motion preference removes camera tweens and passenger bob. WebGL creation/context failures report `onError`; successful first rendering reports `onReady` draw calls and triangles.

The permitted cloud browser has WebGL disabled. Source invariant tests and production compilation verify the implementation contracts, not actual WebGL appearance, camera feel, resource stability on devices or frame rate. No GPU frame-rate claim is supported.

References inspected directly: owner photographs of the July 2026 commercial hall and gate/ad view, and a December 2024 hall/truss/rail glimpse. Preserved anchors are pale pitched triangular trusses, high louvers/daylight roof sheets, cream tiled floor, charcoal bands, yellow tactile routes, edge storefronts, broad advertising faces and metal gates. Exact dimensions, transfer footbridge, fixtures and fictional shop identities are authored. This is KRL Sudirman, distinct from neighboring BNI City / Sudirman Baru.
