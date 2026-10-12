# Lintara 1.3 — a station-first workspace

## A clearer demonstration

Station is now the main canvas, with compact live metrics and a close Hall frame. Business collects the editable opportunity, operating plan (My business in Tenant mode), locations, staffing and campaigns; operators also have Shops. Compare holds Impact & plans and the full Station report. The previous side navigation and permanent demo banner no longer compete for the station's space. Demo remains an optional action.

The header keeps role, quality and saving visible. Quality uses one labeled selector with Lite, Standard and High beside Operator / Tenant. There is one Next train control, in the persistent bottom simulation bar alongside time, playback, speed, arrival status and timeline.

## Time without a hunt

The Time period selector exposes all 18 modeled start hours, 05 through 22. Morning rush at 07, Lunch hour at 12 and Evening rush at 17 are named options. Current time accepts seconds within the selected one-hour window. More controls opens a bounded panel for Start hour, Replay arrival, Add arrival and the timetable.

Next train previews an existing approach; it does not add a wave or modify the plan. Add arrival is an explicit plan change. The selected-hour profiles, relative operating windows and financial model are unchanged from [revision 1.2](REVISION_1_2.md).

## Detail when needed

Add shop opens the catalog on intent. A valid one-step drop commits one placement, closes the catalog and remains undoable. Category-then-unit alternatives, sizing, rotation, validation and cancellation remain available. Moving preserves the business's identity and inputs.

Selecting a shop opens a quick summary without moving the camera. It distinguishes a complete selected-hour forecast from the live queue. Focus shop explicitly moves to a close frame; Business details opens the full inspector. Whole station remains available for context. Camera framing accounts for the canvas aspect and relevant scene geometry rather than using the same broad view for every space.

Station's compact metrics report progress so far. Full-hour projection, cost accounting, capacity, break-even, sensitivities, location/staff alternatives and comparison remain in the analytical views. The optimistic story is a testable improvement with costs included; negative outcomes and no-uplift results remain visible.

## Preserved contracts

- Lite, Standard and High change rendering detail, not demand, modeled passenger representation or financial results. Standard remains the original rendering baseline.
- The live 2D map remains available for phones and WebGL failures, preserving selection, placement, simulation and analysis.
- Baseline, Proposed and Stress retain aligned hour, crowd and seed. Undo/redo, local saving, imports and selected-hour reports remain.
- Tenant pages and briefs retain selected-business scope. Role switching is prototype presentation confidentiality, not production authentication.
- The original brand masters, 16-slide editable identity guide, matching PDF and logo archive remain unchanged. They are original identity specifications, not revised browser captures.

## Verification boundary

See [VERIFICATION.md](VERIFICATION.md) for the final executed source/package checks. This revision does not claim actual browser-pixel, WebGL, touch/orbit or GPU/FPS verification. The available browser disabled WebGL and blocked local preview; those restrictions were not bypassed. Use [BROWSER_TEST_PLAN.md](BROWSER_TEST_PLAN.md) on the demonstration device.

The ninety-second route in [DEMO_GUIDE.md](DEMO_GUIDE.md) connects movement, a tenant business case and an explicit comparison. [REVISION_1_1.md](REVISION_1_1.md) and [REVISION_1_2.md](REVISION_1_2.md) are historical implementation notes; their earlier navigation descriptions do not describe the current workspace.
