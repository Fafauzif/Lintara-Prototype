import { describe, expect, it } from 'vitest';
import { BASELINE, DURATION, freshScenario } from '../src/data/station';
import { canPlace, placeTenant, removeTenant, updateTenant, validateScenario } from '../src/domain/planning';
import { translateError } from '../src/i18n/errors';

describe('bounded station planning', () => {
  it('rejects occupied, unknown, incompatible, and oversized placement', () => {
    const plan = freshScenario();
    expect(canPlace(plan, 'coffee', 'U1').valid).toBe(false);
    expect(canPlace(plan, 'coffee', 'rails').valid).toBe(false);
    expect(canPlace(plan, 'meals', 'S1').valid).toBe(false);
    expect(canPlace(plan, 'coffee', 'S1', 'large').valid).toBe(false);
    expect(canPlace(plan, 'coffee', 'S1', 'medium', 90).valid).toBe(false);
    expect(canPlace(plan, 'coffee', 'S1', 'small', 90).valid).toBe(true);
  });
  it('preserves identity and financial inputs on move without mutating baseline', () => {
    const plan = freshScenario();
    const moved = placeTenant(plan, 'bakery', 'S1', 'small', 90, 'T1');
    expect(moved.tenants[0]).toMatchObject({ id:'T1', name:'Roti Peron', staff:2, unitId:'S1', size:'small', rotation:90 });
    expect(plan.tenants[0].unitId).toBe('U1');
    expect(BASELINE.tenants[0].unitId).toBe('U1');
    expect(canPlace(moved,'bakery','S1','small',90,'T1').valid).toBe(true);
    expect(canPlace(plan,'coffee','S1','small',0,'not-real').valid).toBe(false);
  });
  it('adds fictional identity, updates staff safely and removes dependent campaign atomically', () => {
    const plan = placeTenant(freshScenario(), 'coffee', 'S1', 'small');
    const added = plan.tenants.at(-1)!;
    expect(added.name).toContain('Kopi Sela');
    expect(new Set(plan.tenants.map(t=>t.id)).size).toBe(plan.tenants.length);
    const updated = updateTenant(plan, added.id, { staff:3 });
    expect(updated.tenants.at(-1)!.staff).toBe(3);
    expect(plan.tenants.at(-1)!.staff).toBe(2);
    expect(()=>updateTenant(plan, added.id, { staff:0 })).toThrow(/staff/i);
    expect(()=>updateTenant(plan, added.id, { id:'stolen' })).toThrow(/identity|id/i);
    updated.campaigns.push({id:'C1',name:'Coffee',screenId:'AD1',tenantId:added.id,start:0,end:600,budget:10000,objective:'visits'});
    updated.events.push({id:'E1',type:'staff',start:10,duration:20,magnitude:1,target:added.id});
    const removed = removeTenant(updated,added.id);
    expect(removed.tenants.some(t=>t.id===added.id)).toBe(false);
    expect(removed.campaigns).toEqual([]);
    expect(removed.events).toEqual([]);
  });
});

describe('Indonesian validation feedback',()=>{
  it('translates bounds, identifiers, objects and placement while preserving tenant names',()=>{
    expect(translateError('id',new Error('Tenant staff must be an integer between 1 and 12.'))).toBe('Jumlah staf toko harus berupa bilangan bulat antara 1 dan 12.');
    expect(translateError('id','Tenant Kopi Sela: This unit is occupied. Move or remove its current tenant first.')).toBe('Toko Kopi Sela: Unit ini sudah terisi. Pindahkan atau hapus toko yang menempatinya terlebih dahulu.');
    expect(translateError('id','Campaign name must be non-empty text of at most 80 characters.')).toContain('Nama kampanye');
    expect(translateError('id','Event target contains unsupported ID characters.')).toContain('ID tujuan kejadian');
    expect(translateError('id','Events must be an array containing at most 24 items.')).toContain('24');
    expect(translateError('en','This unit is occupied. Move or remove its current tenant first.')).toContain('occupied');
  });
  it('translates storage wrappers and native parser/quota errors without English tails',()=>{
    const raw='Saved plans could not be read. Your current plan is unchanged. Unsupported saved plan version.';
    expect(translateError('id',raw)).toBe('Rencana tersimpan tidak dapat dibaca. Rencana aktif tetap utuh. Versi rencana tersimpan belum didukung.');
    expect(translateError('id',new SyntaxError('Unexpected token'))).toContain('JSON');
    expect(translateError('id',new Error('QuotaExceededError'))).toContain('penuh');
    expect(translateError('id',new Error('Unknown internal error'))).not.toContain('Unknown');
  });
});

describe('untrusted scenario import', () => {
  it('accepts valid plans as a detached, whitelisted configuration', () => {
    const plan = freshScenario();
    Object.assign(plan.tenants[0],{basket:42000,serviceSeconds:60,margin:.5,occupancyPerDay:450000});
    const imported = validateScenario(plan);
    expect(imported).toEqual(plan);
    imported.tenants[0].staff=8;
    expect(plan.tenants[0].staff).toBe(2);
    expect(()=>updateTenant(plan,'T1',{basket:-5})).toThrow(/basket/i);
    expect(()=>updateTenant(plan,'T1',{serviceSeconds:Infinity})).toThrow(/service/i);
    expect(()=>updateTenant(plan,'T1',{margin:1.5})).toThrow(/margin/i);
  });
  it('rejects malformed schema, references, quantities and placement before mutation', () => {
    expect(()=>validateScenario({...freshScenario(),version:2})).toThrow(/version/i);
    expect(()=>validateScenario({...freshScenario(),seed:NaN})).toThrow(/seed/i);
    for (const invalid of [Infinity,-1,DURATION+1]) {
      const plan=freshScenario();plan.tenants[0].close=invalid;
      expect(()=>validateScenario(plan)).toThrow(/close|hours/i);
    }
    const overlap=freshScenario();overlap.tenants[1].unitId='U1';
    expect(()=>validateScenario(overlap)).toThrow(/occupied|overlap/i);
    const malformed=freshScenario();malformed.tenants[0].rotation=45;
    expect(()=>validateScenario(malformed)).toThrow(/rotation/i);
    const foreign=freshScenario();foreign.campaigns=[{id:'C1',name:'Bad ref',screenId:'AD1',tenantId:'missing',start:0,end:600,budget:10,objective:'visits'}];
    expect(()=>validateScenario(foreign)).toThrow(/tenant|reference/i);
    const badBudget=freshScenario();badBudget.campaigns=[{id:'C1',name:'Bad budget',screenId:'AD1',tenantId:'T1',start:0,end:600,budget:Infinity,objective:'visits'}];
    expect(()=>validateScenario(badBudget)).toThrow(/budget/i);
  });
  it('validates event windows and foreign targets using model event semantics',()=>{
    const plan=freshScenario();
    plan.events=[{id:'E1',type:'staff',start:900,duration:600,magnitude:-1,target:'T1'}];
    expect(validateScenario(plan).events[0].magnitude).toBe(-1);
    plan.events[0].target='missing';
    expect(()=>validateScenario(plan)).toThrow(/target/i);
    plan.events=[{id:'E1',type:'rain',start:3500,duration:600,magnitude:.5}];
    expect(()=>validateScenario(plan)).toThrow(/window/i);
    plan.events=[{id:'E1',type:'delay',start:200,duration:60,magnitude:120,target:'train-999'}];
    expect(()=>validateScenario(plan)).toThrow(/train/i);
  });
  it('preserves campaign creative and archive metadata while rejecting invalid values',()=>{
    const plan=freshScenario();
    plan.campaigns=[{id:'C1',name:'Morning cup',screenId:'AD1',tenantId:'T1',start:0,end:600,budget:20000,objective:'visits',creative:'fresh',archived:true}];
    expect(validateScenario(plan).campaigns[0]).toMatchObject({creative:'fresh',archived:true});
    (plan.campaigns[0] as unknown as {archived:string}).archived='true';
    expect(()=>validateScenario(plan)).toThrow(/archived/i);
  });
  it('accepts awareness, visits and purchases without changing campaign objectives',()=>{
    for(const objective of ['awareness','visits','purchases'] as const){
      const plan=freshScenario();
      plan.campaigns=[{id:'C1',name:'Morning cup',screenId:'AD1',tenantId:'T2',start:0,end:600,budget:20000,objective}];
      expect(validateScenario(plan).campaigns[0].objective).toBe(objective);
    }
    expect(translateError('id','Campaign objective must be awareness, visits, or purchases.')).toBe('Tujuan kampanye harus pengenalan merek, kunjungan, atau pembelian.');
  });
  it('allows concurrent trains on different platforms and rejects same-platform overlap',()=>{
    const plan=freshScenario();
    plan.events=[{id:'wave',type:'arrival',start:240,duration:60,magnitude:80,target:'platform-b'}];
    expect(validateScenario(plan).events).toEqual(plan.events);
    plan.events[0].target='platform-a';
    expect(()=>validateScenario(plan)).toThrow(/train|platform|schedule/i);
    expect(translateError('id','Trains on the same platform overlap. Allow 75 seconds between train stops.')).toContain('minimal 75 detik');
  });
  it('reserves train approach/departure clearance and validates accumulated delays',()=>{
    const plan=freshScenario();
    plan.events=[{id:'wave',type:'arrival',start:370,duration:60,magnitude:80,target:'platform-a'}];
    expect(()=>validateScenario(plan)).toThrow(/train|platform|schedule/i);
    plan.events[0].start=375;
    expect(validateScenario(plan).events[0].start).toBe(375);
    plan.events=[{id:'delay-1',type:'delay',start:240,duration:1,magnitude:900,target:'train-1'},{id:'delay-2',type:'delay',start:240,duration:1,magnitude:300,target:'train-1'}];
    expect(()=>validateScenario(plan)).toThrow(/train|platform|schedule/i);
  });
});
