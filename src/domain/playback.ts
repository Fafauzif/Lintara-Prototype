import type { Scenario } from './types';
import type { TrainScheduleEntry } from './trainSchedule';
import { DURATION } from '../data/station';
import { buildTrainSchedule, checkTrainConflicts, TRAIN_APPROACH_SECONDS, TRAIN_DEPARTURE_SECONDS } from './trainSchedule';

function visibleInModel(train: TrainScheduleEntry): boolean {
  return train.start - TRAIN_APPROACH_SECONDS < DURATION && train.start + train.dwell + TRAIN_DEPARTURE_SECONDS > 0;
}

/** Playback only: selecting or replaying a train never authors an intervention. */
export function arrivalPreview(scenario: Scenario, currentTime: number, mode: 'next' | 'replay'): {time: number; train: TrainScheduleEntry} | null {
  if (!Number.isFinite(currentTime)) return null;
  const time = Math.max(0, Math.min(DURATION, currentTime));
  const schedule = buildTrainSchedule(scenario).filter(visibleInModel);
  const recentFirst = [...schedule].reverse();
  const train = mode === 'next'
    ? schedule.find(entry => entry.start > time)
    : recentFirst.find(entry => time >= entry.start - TRAIN_APPROACH_SECONDS && time < entry.start + entry.dwell + TRAIN_DEPARTURE_SECONDS)
      ?? recentFirst.find(entry => entry.start <= time);
  return train ? { time: Math.max(0, train.start - TRAIN_APPROACH_SECONDS - 5), train } : null;
}

/** Earliest event start that preserves both train approaches and departures on this platform. */
export function availableArrivalStart(scenario: Scenario, start: number, duration: number, platform: 0 | 1): number | null {
  if (!Number.isFinite(start) || !Number.isFinite(duration) || duration < 1 || duration > DURATION
    || (platform !== 0 && platform !== 1) || scenario.events.length >= 24 || checkTrainConflicts(scenario)) return null;
  const dwell = Math.max(60, Math.min(240, duration));
  let candidate = Math.max(0, start);
  const schedule = buildTrainSchedule(scenario).filter(train => train.platform === platform && visibleInModel(train));
  for (const train of schedule) {
    const approach = train.start - TRAIN_APPROACH_SECONDS;
    const departed = train.start + train.dwell + TRAIN_DEPARTURE_SECONDS;
    if (candidate + dwell + TRAIN_DEPARTURE_SECONDS <= approach + 1e-8) break;
    if (candidate - TRAIN_APPROACH_SECONDS >= departed - 1e-8) continue;
    candidate = departed + TRAIN_APPROACH_SECONDS;
  }
  return candidate + duration <= DURATION ? candidate : null;
}
