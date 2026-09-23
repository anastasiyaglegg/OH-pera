import curated from '../../../data/curated.json';
import {mergeCurated,type CuratedPerformance} from '../../../lib/curated';
import bundled from '../../../data/schedule.json';
import type {Schedule} from '../../../lib/schedule';
const FEED='https://raw.githubusercontent.com/anastasiyaglegg/OH-pera/main/data/schedule.json';
function validSchedule(value:unknown):value is Schedule {
 if(!value||typeof value!=='object')return false;
 const v=value as Record<string,unknown>;
 const obj=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object';
 const strings=(x:Record<string,unknown>,keys:string[])=>keys.every(k=>typeof x[k]==='string');
 const url=(x:unknown)=>typeof x==='string'&&/^https:\/\//.test(x);
 return v.schemaVersion===1&&typeof v.generatedAt==='string'&&Number.isFinite(Date.parse(v.generatedAt))&&
 Array.isArray(v.performances)&&v.performances.every(p=>obj(p)&&strings(p,['id','sourceId','title','company','date','checkedAt','palette','label','borough'])&&/^\d{4}-\d{2}-\d{2}$/.test(String(p.date))&&Number.isFinite(Date.parse(String(p.date)))&&url(p.sourceUrl)&&(p.ticketUrl==null||url(p.ticketUrl))&&['opera','concert','screening'].includes(String(p.kind))&&['scheduled','cancelled','unconfirmed'].includes(String(p.status))&&(p.time===null||/^([01]\d|2[0-3]):[0-5]\d$/.test(String(p.time))))&&
 Array.isArray(v.sources)&&v.sources.every(s=>obj(s)&&strings(s,['id','name','status'])&&url(s.url))&&
 Array.isArray(v.announcements)&&v.announcements.every(a=>obj(a)&&strings(a,['id','sourceId','company','title','dateText','checkedAt','note'])&&url(a.sourceUrl));
}
export async function GET(){
 let schedule=bundled as Schedule;
 let delivery:'latest'|'bundled'='bundled';
 try {
   const response=await fetch(FEED,{signal:AbortSignal.timeout(6000),cache:'no-store'});
   if(response.ok){const latest=await response.json();
     if(validSchedule(latest) && Date.parse(latest.generatedAt)>=Date.parse(schedule.generatedAt)) {
       schedule=latest;delivery='latest';
     }
   }
 }catch(error){console.warn('Latest schedule snapshot unavailable:',error instanceof Error?error.message:'request failed');}
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const performances=mergeCurated(schedule.performances,curated as CuratedPerformance[],today);
 return Response.json({...schedule,performances,delivery},{headers:{'Cache-Control':'public, max-age=60, s-maxage=300','X-Content-Type-Options':'nosniff'}});
}
