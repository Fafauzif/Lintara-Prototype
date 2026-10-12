import {Play, TrainFront} from 'lucide-react';
import type {Language, Scenario} from '../domain/types';
import type {TrainScheduleEntry} from '../domain/trainSchedule';
import {DURATION} from '../data/station';
import {TRAIN_APPROACH_SECONDS, TRAIN_DEPARTURE_SECONDS} from '../domain/trainSchedule';
import {time} from '../i18n';
import {revisionTranslate} from '../i18n/revision';
import {Button} from './UI';

export default function TrainInspector({train,scenario,currentTime,lang,onReplay}:{train:TrainScheduleEntry;scenario:Scenario;currentTime:number;lang:Language;onReplay:()=>void}){
 const t=(s:string)=>revisionTranslate(lang,s);
 const outside=train.start-TRAIN_APPROACH_SECONDS>=DURATION||train.start+train.dwell+TRAIN_DEPARTURE_SECONDS<=0;
 const phase=outside?'Outside modeled hour':currentTime<train.start-TRAIN_APPROACH_SECONDS?'Scheduled':currentTime<train.start?'Approaching':currentTime<train.start+train.dwell?'At platform':currentTime<train.start+train.dwell+TRAIN_DEPARTURE_SECONDS?'Departing':'Completed';
 const event=!train.authored?scenario.events.find(e=>`arrival-${e.id}`===train.id):undefined;
 const name=train.authored?`${t('Train')} ${train.id.slice(6)}`:t('Train arrival');
 return <><div className="inspector-hero"><TrainFront size={30}/><span className="eyebrow">{t('Train schedule')}</span><h2>{name}</h2><p>{t(phase)}</p></div><dl className="detail-list"><div><dt>{t('Platform')}</dt><dd>{train.platform+1}</dd></div><div><dt>{t('Time')}</dt><dd>{time(train.start)} WIB</dd></div><div><dt>{t('Dwell')}</dt><dd>{train.dwell} {t('seconds')}</dd></div>{event&&<div><dt>{t('Passengers alighting')}</dt><dd>{event.magnitude}</dd></div>}<div><dt>{t('Assumed demand')}</dt><dd>{t(scenario.crowd==='busy'?'Busy':scenario.crowd==='normal'?'Normal':'Legacy')}</dd></div></dl><Button className="primary full-width" disabled={outside} onClick={onReplay}><Play size={16}/>{t('Replay arrival')}</Button><p className="arrival-note">{t('Use Next train to preview an arrival without changing your plan.')}</p></>;
}
