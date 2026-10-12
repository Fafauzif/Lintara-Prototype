# Revision 1.3 browser acceptance plan

This is a rehearsal plan, not a completed browser-test record. The available cloud browser disabled WebGL and blocked local preview access; neither limitation was bypassed. Controlled component callbacks, server-rendered markup, TypeScript and Vitest do not establish actual focus, responsive pixels, pointer/touch behavior, WebGL appearance or GPU/FPS.

Use `npm ci`, `npm run dev` and the printed local URL in a permitted browser. Test 1920×1080, 1366×768, 768px tablet landscape and 390×844 / 430×932 phones. Also inspect 320px width and 200% browser zoom. The application should not need a runtime CDN, remote fonts or remote models.

## Station layout and discoverability

1. Find the three main destinations: Station, Business and Compare. Quality must remain visibly labeled beside Operator / Tenant, and Save must be discoverable in the header. Check labels, keyboard focus and readable control targets without horizontal page overflow.
2. At desktop sizes, verify the station canvas dominates the working area and the Station page needs no vertical page scroll for normal playback. The compact live metrics must not compete with the canvas or imply a complete-hour forecast. Full analysis belongs in Business / Compare.
3. Find Time period, Current time, Play/Pause, Next train, speed, arrival status and the timeline in the single bottom simulation bar. There must be no duplicate Next train in the header. At phone widths, verify the controls wrap clearly, remain reachable and do not cover focused content.
4. Open More controls. Confirm its upward panel remains bounded within the viewport, scrolls internally when necessary and closes with Escape while returning focus to its summary. Replay arrival, Add arrival, Start hour and timetable must remain reachable.
5. Click a shop. Confirm the quick summary appears without changing camera position or opening the full inspector. Check live queue versus explicitly labeled selected-hour forecast. Use Focus shop for a close frame and Business details for the full inspector. Close the inspector without losing the selected shop or plan.
6. Use Hall, Platforms and Whole station across wide/narrow canvas sizes. Check close framing is useful, reset/orbit/pan/zoom work and selected-floor visibility remains coherent. Pointer dragging the scene must not accidentally select a shop.

## Time, train and placement

7. Select all 18 hours from 05 through 22, including named Morning rush / Lunch hour / Evening rush. Test exact clock seconds and timeline seeking. Confirm the selected window, timetable, reports, demand profile and financial calculations agree. Changing the hour must preserve relative plan windows.
8. Next train and Replay arrival must seek to an approach and play without adding passengers or changing the plan. Verify the end-of-hour disabled state and outside-hour schedule handling. Add arrival must create a legal finite wave, play it and remain undoable.
9. Open Add shop. Drag each category into a legal unit in one release; also test category selection followed by a listed/map unit and keyboard alternatives. Successful placement and cancellation must close the catalog. Its Close/Cancel control must stay visible while scrolling.
10. Verify a single snapped ghost, validation reasons, small/medium/large sizing, R rotation, Escape cancellation, occupied/undersized/disallowed/protected rejection, move, remove, Undo and Redo. Camera position must remain stable throughout placement and immediately after the drop.
11. Pause must freeze people, trains and time. Changing speed and seeking must reconstruct the corresponding queue/service/sales state. Chart cursor, clock, quick summary and inspector must use the same instant. Replay a prior instant and check deterministic results.
12. Delay, rain, route closure and worker absence must affect the relevant schedule, route or service/cost state. Reject repeated same-time events. Undo must restore visible and analytical results.

## Business case and comparison

13. Business subtabs must keep Opportunity, Operating plan (My business in Tenant mode), Locations, Staffing and Campaigns together; operators also have Shops. Compare must separate Impact & plans from Station report. Verify navigation closes transient Station panels and does not accidentally change the scenario.
14. Edit and Apply basket, margin, wage, purchase probability and occupancy assumptions. Test zero basket/margin/probability, zero wage and high costs. Break-even must handle nonpositive gross margin without inventing a finite answer. Service capacity must remain an estimate, not achieved sales.
15. Find an opportunity, inspect tested legal unit/staff combinations, apply one and Undo. Change hour/tenant or leave during a search; obsolete results must never apply. A search with no positive alternative must say so. Neighboring shops and demand must be preserved.
16. Compare Baseline, Proposed and Stress. Verify clearer explanations for lower sales, favorable cost/wait reductions and neutral zero in EN/ID. Avoid double minus signs, negative zero or a stress claim for an intervention that could not be added.
17. Confirm location shortlist and campaign edits, save/edit/duplicate/archive, on/off comparison and reports. Exposure must not be presented as proven attention or causal sales; campaign cost may exceed benefit.
18. Tenant mode must reveal only the selected shop's individual financial/staff details, sensitivities and downloaded/printed brief. Check station aggregate versus private business data, selection changes, forged placement payload guards and role transitions.

## Persistence, fallback and device performance

19. Save/reopen/duplicate/delete/recover plans; valid/invalid/oversized import; denied local storage; reset preserving saved plans. Reports must use the selected hour and current model values. Browser downloads/print must work, exclude controls and avoid competing tenant details in tenant mode.
20. Test EN/ID, IDR/WIB, long labels, errors, large/negative/zero-denominator metrics, tab order, visible focus, Escape and modal focus behavior. Persistent controls must not obscure focused content.
21. Phones should start with live 2D and avoid importing the desktop StationScene/world chunks. Verify map fit/zoom/pan/pinch, selection, catalog drop/tap placement and readable business details. WebGL denial/context loss must preserve the plan and analysis with a useful 2D fallback/retry.
22. At the same paused instant and floor, compare Lite / Standard / High model-present, floor-eligible and submitted counts. Quality must not sample the crowd or change financial results. Exercise repeated quality changes, seeks, hidden/visible wake and overflow fallback.
23. On actual intended devices, record GPU, RAM, OS, browser, viewport, DPR, preset, renderer counts, memory and 30-second frame-time median/p95. Repeat Normal, Busy and a large wave plus ten placement/seek/floor/reset cycles. Software/offscreen rendering is separate evidence from an integrated-GPU laptop.
24. Capture actual final desktop and phone applications only after checks pass. The unchanged identity guide contains original application specifications; it is not a set of revised browser captures. Update that guide only if new screenshots are specifically required.
