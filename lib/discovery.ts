import type {Performance} from './schedule';
export const normalize=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function displayTitle(p:Pick<Performance,'title'|'composer'>){const m=p.title.match(/^(.*?)\s+\(([^)]+)\)$/);return {title:m?.[1]||p.title,composer:p.composer||m?.[2]||null};}
export function productionKey(p:Performance){return [p.sourceId,normalize(displayTitle(p).title),p.kind,p.venue||p.borough].join('|');}
export type Production={key:string;sessions:Performance[]};
export function groupProductions(events:Performance[]):Production[]{const map=new Map<string,Performance[]>();for(const e of [...events].sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'99').localeCompare(b.time||'99'))){const key=productionKey(e);map.set(key,[...(map.get(key)||[]),e]);}return [...map].map(([key,sessions])=>({key,sessions}));}
export function matchesDate(date:string,today:string,range:string,chosen:string){if(date<today)return false;const day=(d:string)=>Date.parse(d+'T12:00:00Z');const diff=(day(date)-day(today))/86400000;if(range==='week')return diff<7;if(range==='month')return date.slice(0,7)===today.slice(0,7);if(range==='date')return !!chosen&&date===chosen;if(range==='weekend'){const weekday=new Date(day(today)).getUTCDay();const start=weekday===0?0:(6-weekday+7)%7;return diff>=start&&diff<=start+(weekday===0?0:1);}return true;}
export type Filters={q:string;range:string;date:string;kind:string;company:string;borough:string};
export const defaultFilters:Filters={q:'',range:'any',date:'',kind:'all',company:'all',borough:'all'};
export function filterEvents(events:Performance[],f:Filters,today:string){const query=normalize(f.q);return events.filter(p=>matchesDate(p.date,today,f.range,f.date)&&(f.kind==='all'||p.kind===f.kind)&&(f.company==='all'||p.company===f.company)&&(f.borough==='all'||p.borough===f.borough)&&normalize([p.title,p.composer,p.company,p.venue].filter(Boolean).join(' ')).includes(query));}
