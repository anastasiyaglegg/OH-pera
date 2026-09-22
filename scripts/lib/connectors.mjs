import {load} from 'cheerio';
import {event,nycToday} from './core.mjs';
import {parseHeartbeat,parseBronx,parseNyco,bamCandidates,parseBamDetail,parseMetFallback,clean} from './parsers.mjs';
export async function fetchPage(url){
 const r=await fetch(url,{headers:{'User-Agent':'OH-pera/1.0 (NYC performance schedule; github.com/anastasiyaglegg/OH-pera)','Accept':'text/html,application/json'},signal:AbortSignal.timeout(25000)});
 if(!r.ok)throw new Error(`Source returned HTTP ${r.status}`);
 const html=await r.text();if(html.length>6000000)throw new Error('Source response exceeds size limit');
 if(/enqueuetoken|metoperawaitingroom|Just a moment\.\.\.|cf-chl-/i.test(html))throw new Error('Official source is behind a waiting room or access challenge');
 return html;
}
export async function collect(source,now,get=fetchPage){
 if(source.id==='met'){
   try{
     const html=await get(source.url),$=load(html),items=[];
     const visit=x=>{if(Array.isArray(x))return x.forEach(visit);if(!x||typeof x!=='object')return;if(x['@type']==='MusicEvent'||x['@type']==='Event')items.push(x);if(x['@graph'])visit(x['@graph']);if(x.subEvent)visit(x.subEvent);};
     $('script[type="application/ld+json"]').each((_,el)=>{try{visit(JSON.parse($(el).text()))}catch{}});
     const performances=items.filter(e=>/^\d{4}-\d{2}-\d{2}/.test(e.startDate)&&/Metropolitan Opera House/i.test(e.location?.name||'')).map(e=>event(source,{title:clean(e.name),date:e.startDate.slice(0,10),time:/T\d{2}:\d{2}/.test(e.startDate)?e.startDate.slice(11,16):null,venue:'Metropolitan Opera House',borough:'Manhattan',neighborhood:'Lincoln Center',sourceUrl:new URL(e.url||source.url,source.url).href,ticketUrl:source.url,status:/EventCancelled/.test(e.eventStatus||'')?'cancelled':'scheduled'},now));
     if(!performances.length)throw new Error('Official calendar did not expose recognizable individual performance data');
     return{performances,announcements:[],status:'live'};
   }catch(error){const result=parseMetFallback(await get('https://leporello.app/'),source);return{...result,message:`${error.message}. Using a secondary snapshot with its original verification date.`};}
 }
 if(source.id==='heartbeat'){
   const home=await get(source.url),$=load(home);const href=$('a[href]').toArray().map(e=>$(e).attr('href')).find(h=>/^\/\d{4}season$/.test(h));
   if(!href)throw new Error('Current season link was not found');const url=new URL(href,source.url).href;
   return parseHeartbeat(await get(url),source,now,url);
 }
 if(source.id==='bronx')return parseBronx(await get(source.url),source,now,source.url);
 if(source.id==='nyco')return parseNyco(await get(source.url),source,now,source.url);
 if(source.id==='bam'){
   const home=await get(source.url),$=load(home);
   // Discover the current HD series from the official programs page, instead of fixing a season year.
   const programs=await get('https://www.bam.org/programs'),p=load(programs);
   const series=p('a[href]').toArray().map(e=>({url:p(e).attr('href'),text:clean(p(e).text())})).find(a=>/The Met: Live in HD/.test(a.text)&&/20\d{2}/.test(a.text));
   const html=series?await get(new URL(series.url,source.url).href):'';
   const candidates=[...new Map([...bamCandidates(home,source.url),...bamCandidates(html,source.url)].filter(c=>c.date>=nycToday(new Date(now))).map(c=>[c.url,c])).values()];
   if(!candidates.length)throw new Error('No dated opera listings recognized; coverage needs review');
   const performances=[];let failures=0;
   for(const candidate of candidates.slice(0,60)){try{performances.push(parseBamDetail(await get(candidate.url),candidate,source,now));}catch{failures++;}}
   if(!performances.length)throw new Error('BAM detail pages could not be verified');
   return{performances,announcements:[],status:'partial',message:`Opera listings and HD screenings checked. ${failures?`${failures} detail pages need review. `:''}Screenings are labeled separately; full live-stage coverage is not yet guaranteed.`};
 }
 throw new Error('No connector configured');
}
