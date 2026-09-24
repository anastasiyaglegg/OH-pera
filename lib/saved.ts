import {validPerformance} from './security.ts';
import type {Performance} from './schedule.ts';
export function readSaved(idsText:string|null,recordsText:string|null){
 const empty={ids:[] as string[],records:{} as Record<string,Performance>};
 if((idsText?.length||0)>50000||(recordsText?.length||0)>2000000)return empty;
 try{
  const ids:unknown=JSON.parse(idsText||'[]'),records:unknown=JSON.parse(recordsText||'{}');
  if(!Array.isArray(ids)||!records||typeof records!=='object'||Array.isArray(records))return empty;
  const safeIds=[...new Set(ids.filter((x):x is string=>typeof x==='string'&&x.length>0&&x.length<=500&&!['__proto__','prototype','constructor'].includes(x)))].slice(0,200);
  const safeRecords=Object.fromEntries(Object.entries(records).filter(([key,value])=>safeIds.includes(key)&&validPerformance(value)&&key===value.id));
  return {ids:safeIds,records:safeRecords as Record<string,Performance>};
 }catch{return empty;}
}
