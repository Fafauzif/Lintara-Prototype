# Graphics and interactive station contract

The graphics preset changes rendering cost and detail. It never changes the number of people eligible for the chosen floor, simulation demand, visits, queues or financial results. Normal/Busy/Legacy demand assumptions are separate model inputs.

## Exact 3D presets

| UI label | Compatible value | DPR ceiling | Shadows | Shadow-map resolution | Passenger capsule segments | Passenger head segments | Passenger material |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| Lite | `low` | 0.75 | Disabled | No active map; configured size 1024 | 1 cap, 4 radial | 5 width, 3 height | Unlit `MeshBasicMaterial` |
| Standard | `balanced` | 1 | Enabled | 1024×1024 | 3 cap, 7 radial | 10 width, 7 height | Lit `MeshStandardMaterial` |
| High | `high` | 1.5 | Enabled | 2048×2048 | 5 cap, 12 radial | 16 width, 10 height | Lit `MeshStandardMaterial` |

Actual DPR is `min(devicePixelRatio, preset ceiling)`. Standard is the existing rendering baseline: the prior capsule/head segments, lit material, DPR ceiling 1 and 1024 shadow map remain intact. The lit passenger materials use roughness 0.82 and metalness 0.035. All presets use capsule radius 0.16 and cylindrical length 0.64; heads scale to 0.18×0.19×0.18. The palette, poses and simulated agents remain the same.

Lite reduces pixel work, passenger geometry and passenger lighting, and removes shadow rendering. High supplies finer curved silhouettes and higher resolution/shadow detail. It does not add arms, legs or additional agents. Passenger instances currently do not cast shadows; the larger High shadow map benefits existing static station/shop shadows. Static station construction, camera controls and simulation remain shared. Antialiasing remains enabled on the renderer.

The internal enum names are unchanged for compatible callers: `low` → Lite, `balanced` → Standard, `high` → High. The UI defaults to Standard. Version 1.3 exposes them through one labeled quality selector directly beside Operator/Tenant in the header; they are not under Layers. The exact profile source is [quality.ts](../src/scene/quality.ts).

## Every eligible person, with explicit overflow

The renderer reads `Snapshot.agents`, then applies only the selected-floor rule:

| Floor | Eligibility |
| --- | --- |
| All | Every snapshot agent |
| Hall | Agent z<5.15 |
| Platform | Agent z≥5.15 |

Every eligible agent is submitted in identity order at every preset. There is no representative sampling or quality-based passenger cap. Instanced bodies, heads and heat circles share geometry/materials. Pools start at 512 instances, grow in 512-person chunks and retain capacity as crowds recede.

The 3D resource limit is **32,768 eligible people in one snapshot**. A larger crowd produces an explicit error containing the limit and requested count, with zero submitted/rendered count for that frame. The application preserves the reason and activates interactive 2D, which retains every passenger and the plan/analysis. It does not draw a truncated 3D crowd and label it complete. The limit is an allocation policy, not evidence that any device can draw 32,768 people smoothly.

The 3D canvas exposes these count datasets for inspection:

| `canvas.dataset` key | Meaning |
| --- | --- |
| `modelPresent` | Snapshot’s model-present total across floors |
| `floorEligible` | Number of agents passing the active floor filter |
| `submittedAgents` | Instanced passenger count submitted for the current 3D frame; zero on overflow |
| `renderedAgents` | Legacy alias of submitted passenger count |
| `samplingCount` | Always zero: graphics quality never samples agents |
| `overflowAgents` | `max(0, floorEligible − 32768)` |
| `crowdCapacity` | Current allocated instance capacity after successful allocation |

Submitted counts are not counts of individually visible pixels: a person may be off-camera or occluded. Floor exclusion is intentional and separately disclosed by `floorEligible`. On overflow the prior capacity may remain in the dataset, but the application switches to 2D.

## Close hall view and direct placement

The application defaults to a closer Hall preset, with roof off and cutaway on. Orthographic framing uses relevant scene bounds projected into the camera view and the actual canvas aspect. Hall, Platforms, Whole station and Top down views remain available. The shared [cameraFraming.ts](../src/scene/cameraFraming.ts) defines view bounds and shop focus for 3D and the live 2D map.

Selecting a shop updates its quick summary and selection highlight without moving the camera. Focus shop is the explicit close-frame action; Business details opens the full inspector. Resizing a canvas recomputes a fitting frame while retaining user zoom. Whole station is the wider context view, rather than the default commercial interaction frame.

Add shop opens the catalog. Clicking a shop card enters placement mode. Clicking a valid unit or dropping its card commits through `onPlace(unitId, category?)` after shared `canPlace` validation. The release reads the supported category from the drag’s `text/plain` payload. Successful placement or cancellation closes the catalog; an invalid target leaves it available with a reason. The existing shop remains visible while it is moved until the committing transaction succeeds.

Exactly one translucent shop ghost follows the current snapped commercial target. It uses the shared size/rotation/frontage transform, appears green when valid and red when invalid, and reports the validation reason through `onPlacementHover`. Hovering a protected route, gate, platform or other non-unit area reports `protected-area` with “Place the shop inside an available commercial unit.” There is no snapped ghost over such a surface and no placement callback. When the pointer leaves the canvas, an explicitly selected unit may remain previewed.

Placement suspends orbit, camera reset and explicit focus. Residual orbit damping is drained while preserving camera position, target and zoom. The first completed placement frame also suppresses focus, so the camera does not jump after a valid drop. R rotates placement by 90° and Escape cancels in the application. Outside placement, R resets the camera and ordinary orbit/pan/zoom controls resume.

## Paused reuse and wake behavior

The snapshot cache is keyed by simulation-result identity and exact clock time. A paused clock with an unchanged result reuses its snapshot. Crowd matrices are refreshed for changed snapshots, floor, animation state, heatmap state or pool/quality resources; unchanged paused matrices are not re-uploaded. Clothing colors are uploaded only when instance identity/color changes or a pool is recreated.

After props, camera tweens and OrbitControls damping settle, `renderer.render` is skipped. A lightweight RAF watcher still checks the mutable clock, props and controls, so playback, seeks, placement, resize and camera changes can wake rendering without requiring React to rebuild the scene. This does not remove all paused CPU work. Hiding the host or document suspends the watcher; visibility restoration wakes it.

Instance replacement disposes old instance resources. Quality replacement disposes prior passenger geometry/materials. Shop changes dispose prior tenant assets and clear cached shop selection locations. Unmount disposes all owned scene resources, controls and renderer.

## Verification limit

The permitted cloud browser has WebGL disabled. Pure scene invariants and TypeScript/Vite compilation cover preset settings, full floor-eligible coverage, chunk allocation, explicit overflow, snapshot reuse, direct placement status, ghost targeting and tenant location cleanup. They do not verify actual WebGL composition, lighting, camera feel, GPU memory stability or pointer/touch behavior on a target device.

No measured GPU frame times or FPS claims are available for these presets. Validate the same baseline, Normal, Busy and large-wave scenarios on real target devices before making a performance claim; verify active-floor submission counts, seeks, paused wake, repeated quality changes, placement framing and overflow fallback. See [BROWSER_TEST_PLAN.md](BROWSER_TEST_PLAN.md) for the broader interaction plan.
