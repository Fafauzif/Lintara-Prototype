import { useId, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Pause, Play, Plus, RotateCcw, SkipForward, TrainFront, ChevronUp } from 'lucide-react';
import type { Language, Scenario, ScenarioEvent } from '../domain/types';
import type { TrainScheduleEntry } from '../domain/trainSchedule';
import { buildTrainSchedule, TRAIN_APPROACH_SECONDS, TRAIN_DEPARTURE_SECONDS } from '../domain/trainSchedule';
import { arrivalPreview } from '../domain/playback';
import { DURATION } from '../data/station';
import { time } from '../i18n';
import { parseClock, startHourOf, windowLabel } from '../domain/period';
import './simulation-controls.css';

export interface SimulationControlsProps {
  lang: Language;
  scenario: Scenario;
  currentTime: number;
  playing: boolean;
  speed: number;
  onTogglePlay: () => void;
  onSpeedChange: (speed: number) => void;
  onSeek: (time: number) => void;
  onPreview: (mode: 'next' | 'replay') => void;
  onAddArrival?: () => void;
  onHourChange?: (hour: number) => void;
  children?: ReactNode;
  compact?: boolean;
}

const copy = {
  en: { play: 'Play', pause: 'Pause', next: 'Next train', replay: 'Replay arrival', add: 'Add arrival', speed: 'Speed', timeline: 'Timeline', timetable: 'Train timetable', platform: 'Platform', train: 'Train', added: 'Added', scheduled: 'Scheduled', approaching: 'Approaching', dwell: 'At platform', departing: 'Departing', waiting: 'Waiting', nextIn: 'Next arrival in', finished: 'No more arrivals in this hour', preview: 'Preview arrival', help: 'Select a train to preview its approach. Scroll the timetable to see the full hour.', interventions: 'Interventions', outside: 'Outside modeled hour', events: { delay: 'Train delay', rain: 'Rain', closure: 'Route closure', staff: 'Staff change' } },
  id: { play: 'Putar', pause: 'Jeda', next: 'Kereta berikutnya', replay: 'Ulangi kedatangan', add: 'Tambah kedatangan', speed: 'Kecepatan', timeline: 'Linimasa', timetable: 'Jadwal kereta', platform: 'Peron', train: 'Kereta', added: 'Tambahan', scheduled: 'Terjadwal', approaching: 'Mendekat', dwell: 'Berhenti di peron', departing: 'Berangkat', waiting: 'Menunggu', nextIn: 'Kedatangan berikutnya dalam', finished: 'Tidak ada kedatangan lagi pada jam ini', preview: 'Pratinjau kedatangan', help: 'Pilih kereta untuk melihat kedatangannya. Geser jadwal untuk melihat seluruh jam.', interventions: 'Intervensi', outside: 'Di luar jam simulasi', events: { delay: 'Keterlambatan kereta', rain: 'Hujan', closure: 'Penutupan jalur', staff: 'Perubahan staf' } },
} as const;

function phaseAt(train: TrainScheduleEntry, currentTime: number): 'approaching' | 'dwell' | 'departing' | null {
  if (currentTime < train.start - TRAIN_APPROACH_SECONDS || currentTime >= train.start + train.dwell + TRAIN_DEPARTURE_SECONDS) return null;
  return currentTime < train.start ? 'approaching' : currentTime < train.start + train.dwell ? 'dwell' : 'departing';
}

function countdown(seconds: number): string {
  const value = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

/** Stack nearby labels so every train remains reachable even in a dense timetable. */
function markerRows<T extends { start: number }>(items: T[]): { item: T; row: number; position: number }[] {
  const previous: number[] = [];
  return items.map(item => {
    const position = Math.max(0, Math.min(DURATION, item.start));
    let row = previous.findIndex(last => position - last >= 480);
    if (row < 0) row = previous.length;
    previous[row] = position;
    return { item, row, position };
  });
}

const markerLeft = (position: number): string => `clamp(0px, calc(${position / DURATION * 100}% - 34px), calc(100% - 68px))`;

export function SimulationControls({ lang, scenario, currentTime, playing, speed, onTogglePlay, onSpeedChange, onSeek, onPreview, onAddArrival, onHourChange, children, compact = false }: SimulationControlsProps) {
  const text = copy[lang];
  const timelineId = useId();
  const now = Number.isFinite(currentTime) ? Math.max(0, Math.min(DURATION, currentTime)) : 0;
  const schedule = useMemo(() => buildTrainSchedule(scenario), [scenario]);
  const next = arrivalPreview(scenario, now, 'next');
  const replay = arrivalPreview(scenario, now, 'replay');
  const addedNames = new Map(schedule.filter(train => !train.authored).map((train, index) => [train.identity, `${text.added} ${index + 1}`]));
  const trainName = (train: TrainScheduleEntry): string => train.authored ? `${text.train} ${train.id.slice(6)}` : addedNames.get(train.identity)!;
  const interventions = markerRows(scenario.events.filter((event): event is ScenarioEvent & { type: Exclude<ScenarioEvent['type'], 'arrival'> } => event.type !== 'arrival').sort((a, b) => a.start - b.start));
  const activePhases = schedule.flatMap(train => {
    const phase = phaseAt(train, now);
    return phase ? [`${text.platform} ${train.platform + 1}: ${trainName(train)} · ${text[phase]}`] : [];
  });
  const clock = `${time(now, scenario)}:${String(Math.floor(now) % 60).padStart(2, '0')}`;
  const periodLabel = lang === 'id' ? 'Waktu simulasi' : 'Time period';
  const currentLabel = lang === 'id' ? 'Waktu saat ini' : 'Current time';
  const moreLabel = lang === 'id' ? 'Kontrol lainnya' : 'More controls';
  const presets = [[7, 'Morning rush', 'Sibuk pagi'], [12, 'Lunch hour', 'Jam makan siang'], [17, 'Evening rush', 'Sibuk sore']] as const;
  const hours = Array.from({ length: 18 }, (_, index) => index + 5);
  const hourLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00–${String(hour + 1).padStart(2, '0')}:00`;

  return <section className={`simulation-controls${compact ? ' simulation-controls--compact' : ''}`} aria-label={text.timeline}>
    <div className="simulation-dock-row">
      <label className="simulation-period-field">{periodLabel}
        <select aria-label={periodLabel} value={startHourOf(scenario)} disabled={!onHourChange} onChange={event => onHourChange?.(Number(event.target.value))} data-testid="time-period">
          <optgroup label={lang === 'id' ? 'Jam utama' : 'Popular periods'}>{presets.map(([hour, en, id]) => <option key={hour} value={hour}>{lang === 'id' ? id : en} · {String(hour).padStart(2, '0')}:00</option>)}</optgroup>
          <optgroup label={lang === 'id' ? 'Jam lainnya' : 'Other hours'}>{hours.filter(hour => !presets.some(preset => preset[0] === hour)).map(hour => <option key={hour} value={hour}>{hourLabel(hour)}</option>)}</optgroup>
        </select>
      </label>
      <label className="simulation-clock-field"><span>{currentLabel} <small>WIB</small></span><input type="time" step={1} min={time(0, scenario)} max={time(DURATION, scenario)} value={clock} aria-label={lang === 'id' ? 'Ke waktu simulasi' : 'Jump to simulation time'} onChange={event => { const value = parseClock(event.target.value, scenario); if (value !== null) onSeek(value); }} /></label>
      <button type="button" className="simulation-action simulation-action--play" aria-label={playing ? text.pause : text.play} onClick={onTogglePlay} data-testid="play-pause">{playing ? <Pause size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}<span>{playing ? text.pause : text.play}</span></button>
      <button type="button" className="simulation-action simulation-action--next" aria-label={text.next} disabled={!next} onClick={() => onPreview('next')} data-testid="next-train"><SkipForward size={16} aria-hidden="true" /><span>{text.next}</span></button>
      <label className="simulation-speed-field">{text.speed}<select value={speed} onChange={event => onSpeedChange(Number(event.target.value))} aria-label={text.speed}>{![1, 10, 60].includes(speed) && <option value={speed}>{speed}×</option>}{[1, 10, 60].map(value => <option value={value} key={value}>{value}×</option>)}</select></label>
      <details className="simulation-more-controls" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus(); } }}>
        <summary aria-label={moreLabel} data-testid="more-controls"><span>{moreLabel}</span><ChevronUp size={15} aria-hidden="true" /></summary>
        <div className="simulation-more-panel">
          <div className="simulation-extra-actions">
            <label className="simulation-hour-label">{lang === 'id' ? 'Mulai jam' : 'Start hour'}<select aria-label={lang === 'id' ? 'Mulai jam' : 'Start hour'} value={startHourOf(scenario)} disabled={!onHourChange} onChange={event => onHourChange?.(Number(event.target.value))}>{hours.map(hour => <option key={hour} value={hour}>{hourLabel(hour)}</option>)}</select></label>
            <button type="button" className="simulation-action" aria-label={text.replay} disabled={!replay} onClick={() => onPreview('replay')} data-testid="replay-arrival"><RotateCcw size={16} aria-hidden="true" /><span>{text.replay}</span></button>
            {onAddArrival && <button type="button" className="simulation-action" aria-label={text.add} onClick={onAddArrival} data-testid="add-arrival"><Plus size={16} aria-hidden="true" /><span>{text.add}</span></button>}
            {children && <div className="simulation-plan-actions">{children}</div>}
          </div>
          <p className="simulation-assumption">{lang === 'id' ? 'Pola arus dan pilihan belanja mengikuti jam yang dipilih. Angka merupakan asumsi simulasi.' : 'Movement and shopping patterns follow the selected hour. Figures are model assumptions.'}</p>
          <div className="simulation-current-phase" role="status" aria-live="polite">{activePhases.length ? activePhases.join(' · ') : text.waiting}</div>
          <div className="simulation-timetable-title"><span><TrainFront size={16} aria-hidden="true" />{text.timetable}</span><small>{schedule.filter(train => train.authored).length} {text.scheduled} · {schedule.filter(train => !train.authored).length} {text.added}</small></div>
          <div className="simulation-timetable-scroll" tabIndex={0} role="region" aria-label={text.timetable}>
          <div className="simulation-timetable">
            {([0, 1] as const).map(platform => {
              const trains = markerRows(schedule.filter(train => train.platform === platform));
              const rows = Math.max(1, ...trains.map(train => train.row + 1));
              const active = schedule.find(train => train.platform === platform && phaseAt(train, now));
              const phase = active && phaseAt(active, now);
              return <div className="simulation-platform" key={platform}>
                <div className="simulation-platform-label"><strong>{text.platform} {platform + 1}</strong><span>{active && phase ? `${trainName(active)} · ${text[phase]}` : text.waiting}</span></div>
                <div className="simulation-platform-track" style={{ height: rows * 48 + 4 }}>
                  <span className="simulation-time-cursor" style={{ left: `${now / DURATION * 100}%` }} aria-hidden="true" />
                  {trains.map(({ item: train, row, position }) => {
                    const phase = phaseAt(train, now);
                    const outside = train.start - TRAIN_APPROACH_SECONDS >= DURATION || train.start + train.dwell + TRAIN_DEPARTURE_SECONDS <= 0;
                    const label = `${trainName(train)} · ${text.platform} ${platform + 1} · ${time(train.start, scenario)} WIB · ${train.authored ? text.scheduled : text.added} · ${outside ? text.outside : text.preview}`;
                    const approach = Math.max(0, train.start - TRAIN_APPROACH_SECONDS);
                    const departure = Math.min(DURATION, train.start + train.dwell + TRAIN_DEPARTURE_SECONDS);
                    return <div key={train.identity}>
                      {!outside && <span className={`simulation-train-window${train.authored ? '' : ' simulation-train-window--added'}`} style={{ left: `${approach / DURATION * 100}%`, width: `${(departure - approach) / DURATION * 100}%`, top: row * 48 + 25 }} aria-hidden="true" />}
                      <button type="button" className={`simulation-train-marker${train.authored ? '' : ' simulation-train-marker--added'}${phase ? ' simulation-train-marker--active' : ''}`} style={{ left: markerLeft(position), top: row * 48 + 4 }} title={label} aria-label={label} aria-current={phase ? 'true' : undefined} disabled={outside} onClick={() => { if (!outside) onSeek(Math.max(0, train.start - TRAIN_APPROACH_SECONDS - 5)); }} data-testid={`train-marker-${train.id}`}><strong>{trainName(train)}</strong><span>{time(train.start, scenario)}</span></button>
                    </div>;
                  })}
                </div>
              </div>;
            })}
            {interventions.length > 0 && <div className="simulation-interventions"><strong>{text.interventions}</strong><div className="simulation-platform-track" style={{ height: Math.max(...interventions.map(marker => marker.row + 1)) * 48 + 4 }}>
              {interventions.map(({ item: event, row, position }) => <button type="button" className="simulation-intervention-marker" key={event.id} style={{ left: markerLeft(position), top: row * 48 + 4 }} title={`${text.events[event.type]} · ${time(event.start, scenario)} WIB`} aria-label={`${text.events[event.type]} · ${time(event.start, scenario)} WIB`} onClick={() => onSeek(event.start)}><strong>{text.events[event.type]}</strong><span>{time(event.start, scenario)}</span></button>)}
            </div></div>}
            <div className="simulation-time-labels">{[0, 900, 1800, 2700, DURATION].map(seconds => <span key={seconds}>{time(seconds, scenario)}</span>)}</div>
          </div>
        </div>
        <div className="simulation-timetable-footer"><span className="simulation-timetable-legend"><i aria-hidden="true" />{text.scheduled}<i className="simulation-added-key" aria-hidden="true" />{text.added}</span><small>{text.help}</small></div>
        </div>
      </details>
    </div>
    <div className="simulation-scrubber">
      <label className="simulation-range-label" htmlFor={timelineId}><span>{text.timeline} · {windowLabel(scenario)}</span><span className="simulation-next-countdown">{next ? <>{text.nextIn} <b>{countdown(next.train.start - now)}</b> · {text.platform} {next.train.platform + 1}</> : text.finished}</span></label>
      <input id={timelineId} type="range" min={0} max={DURATION} step={1} value={now} onChange={event => onSeek(Number(event.target.value))} aria-label={text.timeline} aria-valuetext={`${clock} WIB`} data-testid="timeline" />
    </div>
  </section>;
}
