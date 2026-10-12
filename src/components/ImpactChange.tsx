import {ArrowDown,ArrowUp,Minus} from 'lucide-react';
import type {Language} from '../domain/types';
import {money,number} from '../i18n';

export type ImpactMetric='arrivals'|'visits'|'transactions'|'sales'|'contribution'|'goods'|'labor'|'occupancy'|'campaigns'|'waitMean'|'waitP90'|'abandoned';
export type ImpactTone='favorable'|'unfavorable'|'neutral';

const definitions:Record<ImpactMetric,{kind:'count'|'money'|'wait';good:'up'|'down'|'context';en:string;id:string}>={
 arrivals:{kind:'count',good:'context',en:'arriving passengers',id:'penumpang datang'},
 visits:{kind:'count',good:'up',en:'visits',id:'kunjungan'},
 transactions:{kind:'count',good:'up',en:'transactions',id:'transaksi'},
 sales:{kind:'money',good:'up',en:'sales',id:'Penjualan'},
 contribution:{kind:'money',good:'up',en:'contribution',id:'Kontribusi'},
 goods:{kind:'money',good:'down',en:'cost of goods',id:'Biaya bahan'},
 labor:{kind:'money',good:'down',en:'labor cost',id:'Biaya tenaga kerja'},
 occupancy:{kind:'money',good:'down',en:'occupancy cost',id:'Biaya ruang'},
 campaigns:{kind:'money',good:'down',en:'campaign cost',id:'Biaya kampanye'},
 waitMean:{kind:'wait',good:'down',en:'wait',id:'antrean'},
 waitP90:{kind:'wait',good:'down',en:'90th percentile wait',id:'antrean persentil ke-90'},
 abandoned:{kind:'count',good:'down',en:'people leaving the queue',id:'orang meninggalkan antrean'},
};

/** Wait inputs use model minutes; display changes in whole seconds. */
export function roundedImpactDelta(metric:ImpactMetric,value:number){
 const rounded=Math.sign(value)*Math.round(Math.abs(value)*(definitions[metric].kind==='wait'?60:1));
 return rounded===0?0:rounded;
}

export function describeImpact(lang:Language,metric:ImpactMetric,value:number):{text:string;tone:ImpactTone;direction:'up'|'down'|'same';amount:number}{
 const definition=definitions[metric];const amount=roundedImpactDelta(metric,value);
 if(amount===0)return {text:lang==='id'?'Tidak berubah':'No change',tone:'neutral',direction:'same',amount};
 const up=amount>0;const direction=up?'up':'down';
 const tone=definition.good==='context'?'neutral':up===(definition.good==='up')?'favorable':'unfavorable';
 const magnitude=Math.abs(amount);
 let text:string;
 if(definition.kind==='wait')text=lang==='id'?`${number(lang,magnitude)} detik ${up?'lebih lama':'lebih singkat'} · ${definition.id}`:`${number(lang,magnitude)}s ${up?'longer':'shorter'} ${definition.en}`;
 else if(definition.kind==='money')text=lang==='id'?`${definition.id} ${up?'naik':'turun'} ${money(lang,magnitude)}`:`${money(lang,magnitude)} ${up?'higher':'lower'} ${definition.en}`;
 else if(metric==='abandoned')text=lang==='id'?`${number(lang,magnitude)} orang ${up?'lebih banyak':'lebih sedikit'} meninggalkan antrean`:`${number(lang,magnitude)} ${up?'more':'fewer'} people leave the queue`;
 else text=lang==='id'?`${number(lang,magnitude)} ${definition.id} ${up?'lebih banyak':'lebih sedikit'}`:`${number(lang,magnitude)} ${up?'more':'fewer'} ${definition.en}`;
 return {text,tone,direction,amount};
}

export function formatImpactValue(lang:Language,metric:ImpactMetric,value:number){
 const definition=definitions[metric];
 if(definition.kind==='money')return money(lang,value);
 if(definition.kind==='wait')return `${number(lang,Math.round(value*60))} ${lang==='id'?'detik':'s'}`;
 return number(lang,value);
}

/** Desirability and numerical direction are separate: a lower cost is favorable. */
export function ImpactChange({lang,metric,value,className=''}:{lang:Language;metric:ImpactMetric;value:number;className?:string}){
 const impact=describeImpact(lang,metric,value);const Icon=impact.direction==='same'?Minus:impact.direction==='up'?ArrowUp:ArrowDown;
 return <span className={`impact-change impact-${impact.tone} ${className}`} data-impact-tone={impact.tone} data-impact-metric={metric}><Icon size={14} aria-hidden="true"/><span>{impact.text}</span></span>;
}
