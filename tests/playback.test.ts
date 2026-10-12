import { describe, expect, it } from 'vitest';
import { DURATION, freshScenario } from '../src/data/station';
import { arrivalPreview, availableArrivalStart } from '../src/domain/playback';
import { checkTrainConflicts } from '../src/domain/trainSchedule';
import type { Scenario, ScenarioEvent } from '../src/domain/types';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SimulationControls, type SimulationControlsProps } from '../src/components/SimulationControls';

function planWith(...events: ScenarioEvent[]): Scenario {
  const scenario = freshScenario();
  scenario.events = events;
  return scenario;
}

const added = (id: string, start: number, duration = 60, platform = 0): ScenarioEvent => ({
  id, type: 'arrival', start, duration, magnitude: 90, target: platform === 0 ? 'platform-a' : 'platform-b',
});

describe('arrival playback previews', () => {
  it('previews the next stop from five seconds before its approach, including an approaching train', () => {
    const scenario = freshScenario();
    expect(arrivalPreview(scenario, 0, 'next')).toMatchObject({ time: 195, train: { id: 'train-1', start: 240 } });
    expect(arrivalPreview(scenario, 220, 'next')).toMatchObject({ time: 195, train: { id: 'train-1' } });
    expect(arrivalPreview(scenario, 240, 'next')).toMatchObject({ time: 795, train: { id: 'train-2' } });
  });

  it('uses the actual delayed and added timetable without changing the plan', () => {
    const scenario = planWith(
      { id: 'late', type: 'delay', start: 200, duration: 100, magnitude: 120, target: 'train-1' },
      added('extra', 300, 60, 1),
    );
    const before = structuredClone(scenario);
    expect(arrivalPreview(scenario, 0, 'next')).toMatchObject({ time: 255, train: { id: 'arrival-extra', start: 300, platform: 1 } });
    expect(arrivalPreview(scenario, 300, 'next')).toMatchObject({ time: 315, train: { id: 'train-1', start: 360 } });
    expect(scenario).toEqual(before);
  });

  it('replays a current approach, dwell, or departure before falling back to the most recent stop', () => {
    const scenario = freshScenario();
    expect(arrivalPreview(scenario, 195, 'replay')).toBeNull();
    for (const currentTime of [200, 220, 240, 300, 334, 335, 700]) {
      expect(arrivalPreview(scenario, currentTime, 'replay')).toMatchObject({ time: 195, train: { id: 'train-1' } });
    }
    expect(arrivalPreview(scenario, 800, 'replay')).toMatchObject({ time: 795, train: { id: 'train-2' } });
    expect(arrivalPreview(scenario, DURATION, 'replay')).toMatchObject({ time: 3195, train: { id: 'train-6' } });
    expect(arrivalPreview(scenario, DURATION, 'next')).toBeNull();
  });

  it('skips trains wholly outside the modeled hour while allowing a visible boundary approach', () => {
    const scenario = planWith(
      { id: 'outside', type: 'delay', start: 0, duration: DURATION, magnitude: 9999 },
      added('too-early', -200),
      added('too-late', DURATION + 40),
    );
    expect(arrivalPreview(scenario, 0, 'next')).toBeNull();
    expect(arrivalPreview(scenario, DURATION, 'replay')).toBeNull();
    scenario.events.push(added('edge', DURATION + 10));
    expect(arrivalPreview(scenario, DURATION - 10, 'next')).toMatchObject({ time: 3565, train: { id: 'arrival-edge' } });
    expect(arrivalPreview(scenario, DURATION, 'replay')).toMatchObject({ time: 3565, train: { id: 'arrival-edge' } });
  });

  it('clamps an early preview to the beginning of the modeled hour', () => {
    const scenario = planWith(added('opening', 20));
    expect(arrivalPreview(scenario, 0, 'next')).toMatchObject({ time: 0, train: { id: 'arrival-opening' } });
    expect(arrivalPreview(scenario, 0, 'replay')).toMatchObject({ time: 0, train: { id: 'arrival-opening' } });
  });
});

describe('safe arrival slots', () => {
  it('preserves exact approach/departure clearance and moves a conflicting stop to the earliest slot', () => {
    const scenario = freshScenario();
    expect(availableArrivalStart(scenario, 105, 60, 0)).toBe(105);
    expect(availableArrivalStart(scenario, 105.1, 60, 0)).toBe(375);
    expect(availableArrivalStart(scenario, 240, 60, 0)).toBe(375);
    expect(availableArrivalStart(scenario, 375, 60, 0)).toBe(375);
  });

  it('allows the other platform independently and returns a schedule accepted by the conflict validator', () => {
    const scenario = freshScenario();
    const start = availableArrivalStart(scenario, 240, 60, 1);
    expect(start).toBe(240);
    expect(checkTrainConflicts({ events: [...scenario.events, added('new', start!, 60, 1)] })).toBeNull();
  });

  it('reserves actual dwell for a short event and searches past multiple conflicting stops', () => {
    expect(availableArrivalStart(freshScenario(), 150, 1, 0)).toBe(375);
    const scenario = planWith(added('existing', 500, 180));
    const before = structuredClone(scenario);
    const start = availableArrivalStart(scenario, 250, 180, 0);
    expect(start).toBe(755);
    expect(checkTrainConflicts({ events: [...scenario.events, added('new', start!, 180)] })).toBeNull();
    expect(scenario).toEqual(before);
  });

  it('respects delays when finding space for another train', () => {
    const scenario = planWith({ id: 'late', type: 'delay', start: 200, duration: 100, magnitude: 600, target: 'train-1' });
    expect(availableArrivalStart(scenario, 700, 180, 0)).toBe(975);
  });

  it('honors the event horizon and event limit without rejecting an existing edge animation', () => {
    expect(availableArrivalStart(freshScenario(), -20, 60, 0)).toBe(0);
    expect(availableArrivalStart(freshScenario(), 3540, 60, 0)).toBe(3540);
    expect(availableArrivalStart(freshScenario(), 3541, 60, 0)).toBeNull();
    expect(availableArrivalStart(freshScenario(), DURATION, 1, 1)).toBeNull();
    const full = planWith(...Array.from({ length: 24 }, (_, i): ScenarioEvent => ({ id: `rain-${i}`, type: 'rain', start: i, duration: 60, magnitude: .5 })));
    expect(availableArrivalStart(full, 600, 60, 0)).toBeNull();
  });

  it('does not propose a stop for an invalid request or an already conflicting timetable', () => {
    expect(availableArrivalStart(freshScenario(), Number.NaN, 60, 0)).toBeNull();
    expect(availableArrivalStart(freshScenario(), 0, 0, 0)).toBeNull();
    expect(availableArrivalStart(freshScenario(), 0, Number.POSITIVE_INFINITY, 0)).toBeNull();
    expect(availableArrivalStart(planWith(added('conflict', 240)), 600, 60, 0)).toBeNull();
  });
});

const controls = (overrides: Partial<SimulationControlsProps> = {}): string => renderToStaticMarkup(createElement(SimulationControls, {
  lang: 'en', scenario: freshScenario(), currentTime: 220, playing: false, speed: 10,
  onTogglePlay: () => {}, onSpeedChange: () => {}, onSeek: () => {}, onPreview: () => {}, onAddArrival: () => {},
  ...overrides,
}));

describe('accessible shared playback controls', () => {
  it('shows named actions, both platforms, all scheduled and added trains, and the unified time range', () => {
    const markup = controls({ scenario: planWith(added('extra', 500, 60, 0), { id: 'wet', type: 'rain', start: 900, duration: 120, magnitude: .5 }) });
    for (const label of ['Play', 'Next train', 'Replay arrival', 'Add arrival', 'Platform 1', 'Platform 2', 'Timeline', 'Rain']) {
      expect(markup).toContain(label);
    }
    for (let n = 1; n <= 6; n++) expect(markup).toContain(`Train ${n}`);
    expect(markup).toContain('Added 1');
    expect(markup).toContain('type="range"');
    expect(markup).toContain('min="0" max="3600"');
    expect(markup).toContain('07:00');
    expect(markup).toContain('08:00');
    expect(markup).toContain('Approaching');
    expect(markup).toContain('00:20');
  });

  it('localizes playback and phase labels into Indonesian and honors optional arrival creation', () => {
    const markup = controls({ lang: 'id', playing: true, onAddArrival: undefined });
    for (const label of ['Jeda', 'Kereta berikutnya', 'Ulangi kedatangan', 'Peron 1', 'Peron 2', 'Mendekat']) expect(markup).toContain(label);
    expect(markup).not.toContain('Tambah kedatangan');
  });

  it('disables previews when no next or replayable arrival exists', () => {
    expect(controls({ currentTime: 0 })).toMatch(/aria-label="Replay arrival"[^>]*disabled=""/);
    expect(controls({ currentTime: DURATION })).toMatch(/aria-label="Next train"[^>]*disabled=""/);
  });

  it('keeps the action bar, phase, countdown and range visible above the collapsed timetable', () => {
    const markup = controls();
    const detailsStart = markup.indexOf('<details');
    expect(detailsStart).toBeGreaterThan(0);
    const alwaysVisible = markup.slice(0, detailsStart);
    for (const label of ['Play', 'Next train', 'Replay arrival', 'Add arrival', 'Speed', 'Approaching', '00:20']) expect(alwaysVisible).toContain(label);
    expect(alwaysVisible).toContain('type="range"');
    expect(markup.slice(detailsStart)).toMatch(/^<details[^>]*><summary[^>]*>/);
    expect(markup.slice(detailsStart).split('>')[0]).not.toContain('open');
    expect(markup.slice(detailsStart)).toContain('Train timetable');
    expect(markup.slice(detailsStart)).toContain('train-marker-train-6');
  });
});
