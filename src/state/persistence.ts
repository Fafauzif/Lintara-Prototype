import type { Scenario } from '../domain/types';
import { validateScenario } from '../domain/planning';

const KEY='lintara.plans.v1', MAX_PLANS=30, MAX_BYTES=1000000;
function storage():Storage {
  // Both access to the getter and use of its methods may be denied by the browser.
  const available=globalThis.localStorage;
  if(!available)throw new Error('Local storage is unavailable in this browser.');
  return available;
}
function validatedPlans(value:unknown):Scenario[] {
  if(!Array.isArray(value)||value.length>MAX_PLANS)throw new Error(`Saved plans must contain at most ${MAX_PLANS} plans.`);
  const plans=value.map(validateScenario);
  if(new Set(plans.map(p=>p.id)).size!==plans.length)throw new Error('Saved plan IDs must be unique.');
  return plans;
}
export function loadPlans():{plans:Scenario[];error?:string} {
  try{
    const raw=storage().getItem(KEY);
    if(!raw)return {plans:[]};
    if(raw.length>MAX_BYTES)throw new Error('Saved plan data is too large.');
    const envelope:unknown=JSON.parse(raw);
    if(!envelope||typeof envelope!=='object'||Array.isArray(envelope)||!('version' in envelope)||envelope.version!==1)
      throw new Error('Unsupported saved plan version.');
    return {plans:validatedPlans('plans' in envelope?envelope.plans:undefined)};
  }catch(error){return {plans:[],error:`Saved plans could not be read. Your current plan is unchanged. ${error instanceof Error?error.message:'Check browser storage permissions.'}`};}
}
export function savePlans(plans:Scenario[]):{ok:boolean;error?:string} {
  try{
    const safe=validatedPlans(plans);
    const serialized=JSON.stringify({version:1,plans:safe});
    if(serialized.length>MAX_BYTES)throw new Error('Saved plan data exceeds the local limit. Export a plan as JSON first.');
    storage().setItem(KEY,serialized);
    return {ok:true};
  }catch(error){return {ok:false,error:`The plan could not be saved. Keep this session open and export JSON, or allow browser storage. ${error instanceof Error?error.message:''}`};}
}
