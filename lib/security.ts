import type {Performance, Schedule} from './schedule.ts';

export const presenterHosts:Record<string,readonly string[]> = {
 met:['www.metopera.org','metopera.org'], bam:['www.bam.org','bam.org'],
 heartbeat:['www.heartbeatopera.org','heartbeatopera.org'],
 nyco:['www.nycopera.com','nycopera.com'], bronx:['bronxopera.org','www.bronxopera.org'],
};
const ticketHosts = ['www.universe.com','universe.com'];
const evidenceHosts = ['leporello.app','v16live.metopera.org'];
export const sourceHosts = [...Object.values(presenterHosts).flat(),...evidenceHosts];
export function trustedUrl(value:unknown, hosts:readonly string[], base?:string):string|null {
 if(typeof value!=='string'||!value.trim()||value.length>2048||/[\x00-\x20\x7f\\]/.test(value))return null;
 try {const u=new URL(value,base);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&hosts.includes(u.hostname)?u.href:null;}catch{return null;}
}
export function listingUrl(value:unknown,sourceId:string,kind:'source'|'ticket'|'evidence'='source'){
 if(!Object.hasOwn(presenterHosts,sourceId))return null;
 return trustedUrl(value,[...presenterHosts[sourceId],...(kind==='ticket'?ticketHosts:kind==='evidence'?evidenceHosts:[])]);
}
const obj=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const text=(x:unknown,max=500):x is string=>typeof x==='string'&&x.length>0&&x.length<=max;
const optionalText=(x:unknown,max=500)=>x==null||(typeof x==='string'&&x.length<=max);
const stamp=(x:unknown)=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(x)&&x.length<=40&&Number.isFinite(Date.parse(x));
export const validDate=(x:unknown)=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x;
export function validPerformance(p:unknown):p is Performance {
 if(!obj(p)||!text(p.sourceId)||!Object.hasOwn(presenterHosts,p.sourceId))return false;
 return ['id','title','company','palette','label'].every(k=>text(p[k]))&&
 ['composer','venue','neighborhood','runtime','language'].every(k=>optionalText(p[k]))&&optionalText(p.description,10000)&&
 ['Manhattan','Brooklyn','Queens','The Bronx','Staten Island'].includes(String(p.borough))&&validDate(p.date)&&stamp(p.checkedAt)&&
 (p.time===null||(typeof p.time==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(p.time)))&&
 ['opera','concert','screening'].includes(String(p.kind))&&['scheduled','cancelled','unconfirmed'].includes(String(p.status))&&
 !!listingUrl(p.sourceUrl,p.sourceId)&&(p.ticketUrl==null||!!listingUrl(p.ticketUrl,p.sourceId,'ticket'))&&
 (p.provenanceUrl==null||!!listingUrl(p.provenanceUrl,p.sourceId,'evidence'))&&
 (p.verification==null||['manual','secondary'].includes(String(p.verification)))&&
 optionalText(p.reviewedBy)&&optionalText(p.evidenceNote,10000)&&
 (p.evidenceMethod==null||p.evidenceMethod==='indexed-official')&&
 (p.reviewBy==null||validDate(p.reviewBy))&&
 (p.verification!=='manual'||(text(p.reviewedBy)&&text(p.evidenceNote,10000)&&validDate(p.reviewBy)));
}
export function validSchedule(value:unknown):value is Schedule {
 if(!obj(value)||value.schemaVersion!==1||!stamp(value.generatedAt)||!text(value.coverage,2000))return false;
 if(!Array.isArray(value.performances)||value.performances.length>5000||!value.performances.every(validPerformance))return false;
 if(new Set(value.performances.map(p=>p.id)).size!==value.performances.length)return false;
 return Array.isArray(value.sources)&&value.sources.length<=20&&value.sources.every(s=>obj(s)&&text(s.id)&&Object.hasOwn(presenterHosts,s.id)&&text(s.name)&&!!listingUrl(s.url,s.id)&&['live','partial','fallback','error'].includes(String(s.status))&&(s.lastSuccessAt===null||stamp(s.lastSuccessAt))&&(s.lastAttemptAt===null||stamp(s.lastAttemptAt))&&optionalText(s.message,2000))&&
 Array.isArray(value.announcements)&&value.announcements.length<=1000&&value.announcements.every(a=>obj(a)&&text(a.sourceId)&&['id','title','company','dateText'].every(k=>text(a[k]))&&optionalText(a.note,2000)&&stamp(a.checkedAt)&&!!listingUrl(a.sourceUrl,a.sourceId)&&(a.ticketUrl==null||!!listingUrl(a.ticketUrl,a.sourceId,'ticket')));
}
