import curated from '../../../data/curated.json';
import bundled from '../../../data/schedule.json';
import {mergeCurated,type CuratedPerformance} from '../../../lib/curated';
import {validSchedule} from '../../../lib/security';
import {fetchTrustedText} from '../../../lib/safe-fetch';
import type {Schedule} from '../../../lib/schedule';
const FEED='https://raw.githubusercontent.com/anastasiyaglegg/OH-pera/main/data/schedule.json';
const TTL=300000;
type Snapshot={schedule:Schedule;delivery:'latest'|'bundled'};
let cached:Snapshot|null=null;
let expires=0;
let pending:Promise<Snapshot>|null=null;
async function loadSchedule():Promise<Snapshot>{
 if(cached&&Date.now()<expires)return cached;
 if(pending)return pending;
 pending=(async()=>{
  if(!validSchedule(bundled))throw Error('Invalid bundled schedule');
  let schedule=(cached?.schedule||bundled) as Schedule;
  let delivery:'latest'|'bundled'=cached?.delivery||'bundled';
  try{
   const latest:unknown=JSON.parse(await fetchTrustedText(FEED,['raw.githubusercontent.com'],2000000));
   if(validSchedule(latest)&&Date.parse(latest.generatedAt)>=Date.parse(schedule.generatedAt)){schedule=latest;delivery='latest';}
  }catch{ /* Keep the last validated snapshot; never log response bodies or URLs. */ }
  cached={schedule,delivery};expires=Date.now()+TTL;return cached;
 })();
 try{return await pending;}finally{pending=null;}
}
export async function GET(){
 const {schedule,delivery}=await loadSchedule();
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const performances=mergeCurated(schedule.performances,curated as CuratedPerformance[],today);
 return Response.json({...schedule,performances,delivery},{headers:{'Cache-Control':'public, max-age=60, s-maxage=300','X-Content-Type-Options':'nosniff'}});
}
