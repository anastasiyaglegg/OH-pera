import {validPerformance} from './security.ts';
import type {Performance} from './schedule.ts';

export type CuratedPerformance = Performance & {
 verification:'manual'; reviewedBy:string; reviewBy:string; evidenceNote:string;
};
const normalize=(value:string|null)=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const key=(p:Performance)=>[p.sourceId,normalize(p.title),normalize(p.venue),p.date,p.time||''].join('|');
const validDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
const safeUrl=(value:string)=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}};

// This fails closed: incomplete editorial records must never reach the public feed.
export function validateCurated(entries:CuratedPerformance[]):void {
 if(!Array.isArray(entries))throw new Error('Curated listings must be an array');
 const ids=new Set<string>();const keys=new Set<string>();
 for(const p of entries){
  if(!validPerformance(p)||!p.id?.startsWith('curated-')||ids.has(p.id)||keys.has(key(p))||p.verification!=='manual'||
   !p.title?.trim()||!p.company?.trim()||!p.sourceId?.trim()||!p.venue?.trim()||!p.reviewedBy?.trim()||!p.evidenceNote?.trim()||
   !validDate(p.date)||!validDate(p.reviewBy)||!Number.isFinite(Date.parse(p.checkedAt))||p.reviewBy<p.checkedAt.slice(0,10)||
   !safeUrl(p.sourceUrl)||(p.ticketUrl!==null&&!safeUrl(p.ticketUrl))||
   !['Manhattan','Brooklyn','Queens','The Bronx','Staten Island'].includes(p.borough)||
   !['opera','concert','screening'].includes(p.kind)||!['scheduled','cancelled','unconfirmed'].includes(p.status)||
   (p.time!==null&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(p.time)))throw new Error(`Invalid curated listing: ${p?.id||'unknown'}`);
  ids.add(p.id);keys.add(key(p));
 }
}

export function mergeCurated(automated:Performance[],entries:CuratedPerformance[],today:string):Performance[]{
 validateCurated(entries);
 const listings=new Map(automated.filter(p=>p.verification!=='manual').map(p=>[key(p),p]));
 for(const entry of entries){
  if(entry.date<today)continue;
  const existing=listings.get(key(entry));
  // A newer automated source check wins. Preserve IDs when a listing already exists.
  if(existing&&Date.parse(existing.checkedAt)>Date.parse(entry.checkedAt))continue;
  listings.set(key(entry),{...entry,id:existing?.id||entry.id,status:entry.status==='cancelled'?'cancelled':entry.reviewBy<today?'unconfirmed':entry.status});
 }
 return [...listings.values()].filter(p=>p.date>=today).sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'99:99').localeCompare(b.time||'99:99'));
}
