import {RotateCw, X} from 'lucide-react';
import type {Category, Language, Scenario, Tenant} from '../domain/types';
import {CATEGORIES, UNITS} from '../data/station';
import {canPlace} from '../domain/planning';
import {translateError} from '../i18n/errors';
import {categoryLabel} from '../i18n';
import {revisionTranslate} from '../i18n/revision';
import {ShopIcon} from './UI';

interface Props {
 lang:Language; scenario:Scenario; movingOnly?:boolean; category:Category|null; size:Tenant['size']; rotation:number; movingId?:string;
 hover:{unitId:string;valid:boolean;reason:string}|null;
 onCategory:(category:Category)=>void; onSize:(size:Tenant['size'])=>void; onRotate:()=>void; onCancel:()=>void;
 onPlace:(unitId:string,category?:Category)=>void;
 onHover:(hover:{unitId:string;valid:boolean;reason:string}|null)=>void;
}
export default function ShopDock(p:Props){
 const t=(s:string)=>revisionTranslate(p.lang,s);
 const text=(en:string,id:string)=>p.lang==='id'?id:en;
 const hover=p.hover&&p.category?(UNITS.some(u=>u.id===p.hover?.unitId)?{...p.hover,...canPlace(p.scenario,p.category,p.hover.unitId,p.size,p.rotation,p.movingId)}:p.hover):null;
 return <section className={`shop-dock ${p.category?'is-placing':''}`} aria-label={text('Place a shop','Tempatkan toko')}>
  <div className="dock-heading"><strong>{p.movingId?text('Move shop','Pindahkan toko'):text('Add a shop','Tambah toko')}</strong><span>{text('Drag a card or choose a category and unit','Seret kartu atau pilih kategori dan unit')}</span>{p.category&&<button className="icon-button" aria-label={t('Cancel')} onClick={p.onCancel}><X size={17}/></button>}</div>
  <div className="dock-main"><div className="dock-categories">{(p.movingOnly&&p.category?[p.category]:Object.keys(CATEGORIES) as Category[]).map(category=><button key={category} draggable aria-pressed={p.category===category} className={p.category===category?'selected':''} data-testid={`shop-card-${category}`} onClick={()=>p.onCategory(category)} onDragStart={e=>{p.onCategory(category);e.dataTransfer.effectAllowed='copy';e.dataTransfer.setData('text/plain',category);}}><ShopIcon category={category} size={20}/><span>{t(categoryLabel(category))}</span></button>)}</div>
  {p.category&&<div className="dock-settings"><label>{t('Footprint')}<select aria-label={t('Footprint')} value={p.size} onChange={e=>p.onSize(e.target.value as Tenant['size'])}><option value="small">3 × 2 m</option><option value="medium">4 × 3 m</option><option value="large">6 × 4 m</option></select></label><button className="button secondary" aria-label={text('Rotate shop 90 degrees','Putar toko 90 derajat')} onClick={p.onRotate}><RotateCw size={15}/>{p.rotation}°</button></div>}</div>
  {p.category&&<div className="dock-placement"><div className="dock-units" aria-label={text('Choose an available unit','Pilih unit tersedia')}>{UNITS.map(unit=>{const fit=canPlace(p.scenario,p.category!,unit.id,p.size,p.rotation,p.movingId);return <button key={unit.id} disabled={!fit.valid} title={fit.reason?translateError(p.lang,fit.reason):text('Place here','Tempatkan di sini')} onFocus={()=>p.onHover({unitId:unit.id,...fit})} onMouseEnter={()=>p.onHover({unitId:unit.id,...fit})} onClick={()=>p.onPlace(unit.id,p.category!)}>{unit.label}</button>;})}</div><p className={hover&&!hover.valid?'invalid':'valid'} role="status">{hover?`${UNITS.find(u=>u.id===hover.unitId)?`${t('Unit')} ${UNITS.find(u=>u.id===hover.unitId)?.label} · `:''}${hover.valid?text('Release to place · Undo available','Lepas untuk memasang · Bisa Undo'):hover.unitId==='protected-area'?t(hover.reason):translateError(p.lang,hover.reason)}`:text('Choose a highlighted unit. R rotates; Escape cancels.','Pilih unit yang ditandai. R memutar; Escape membatalkan.')}</p></div>}
 </section>;
}
