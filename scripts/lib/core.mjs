import { createHash } from 'node:crypto';

export const SOURCES = [
  { id:'met', name:'Metropolitan Opera', url:'https://www.metopera.org/Calendar/', palette:'plum' },
  { id:'nyco', name:'New York City Opera', url:'https://www.nycopera.com/events', palette:'blue' },
  { id:'heartbeat', name:'Heartbeat Opera', url:'https://www.heartbeatopera.org/', palette:'amber' },
  { id:'bronx', name:'Bronx Opera', url:'https://bronxopera.org/this-season/', palette:'coral' },
  { id:'bam', name:'BAM', url:'https://www.bam.org/', palette:'olive' },
];
export function nycToday(now=new Date()) {
  return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
export function validDate(value) {
  return typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value+'T12:00:00Z')) && new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
}
export function safeUrl(value, base) {
  if(typeof value!=='string'||!value.trim())return null;
  try { const u=new URL(value,base); return u.protocol==='https:' && !u.username && !u.password ? u.href : null; } catch {return null;}
}
export function idFor(source,...parts) {return source+'-'+createHash('sha256').update(parts.join('|')).digest('hex').slice(0,18);}
export function event(source, fields, checkedAt) {
  if(!validDate(fields.date) || !fields.title?.trim() || !safeUrl(fields.sourceUrl)) throw new Error('Invalid performance record');
  if(!['Manhattan','Brooklyn','Queens','The Bronx','Staten Island'].includes(fields.borough)) throw new Error('Unverified NYC venue');
  const time=fields.time || null;
  if(time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Invalid time');
  return { id:idFor(source.id,fields.sourceId||fields.sourceUrl,fields.date,time||''),sourceId:source.id,company:source.name,
    composer:null,description:null,runtime:null,language:null,neighborhood:null,venue:null,ticketUrl:null,
    kind:'opera',status:'scheduled',palette:source.palette,label:'OPERA',checkedAt,...fields,time };
}
export function mergeSource(previous,result,source,now) {
  const prior=previous.performances.filter(e=>e.sourceId===source.id);
  const priorAnnouncements=(previous.announcements||[]).filter(e=>e.sourceId===source.id);
  const old=previous.sources.find(s=>s.id===source.id);
  if(result.error) return {performances:prior,announcements:priorAnnouncements,source:{...source,lastAttemptAt:now,lastSuccessAt:old?.lastSuccessAt||null,status:'error',message:result.error}};
  const unique=new Map(result.performances.map(e=>[e.id,e]));
  // A missing record is not evidence of cancellation. Retain it, visibly unconfirmed.
  for(const p of prior) if(!unique.has(p.id) && p.date>=nycToday(new Date(now))) unique.set(p.id,{...p,status:p.status==='cancelled'?'cancelled':'unconfirmed'});
  return {performances:[...unique.values()],announcements:result.announcements||[],source:{...source,lastAttemptAt:now,lastSuccessAt:result.verifiedAt||now,status:result.status||'live',message:result.message||null}};
}
