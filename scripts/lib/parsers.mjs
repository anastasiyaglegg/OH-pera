import {load} from 'cheerio';
import {event,idFor,safeUrl,validDate} from './core.mjs';
export const clean=value=>load(String(value||'').replace(/<br\s*\/?\s*>/gi,' ')).text().replace(/[\u200b-\u200d]/g,'').replace(/\s+/g,' ').trim();
const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
export function dateFromText(text) {
 const m=clean(text).match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s*(20\d{2})\b/i);
 if(!m)return null;const d=`${m[3]}-${String(months.indexOf(m[1].slice(0,3).toLowerCase())+1).padStart(2,'0')}-${m[2].padStart(2,'0')}`;return validDate(d)?d:null;
}
export function timeFromText(text){const m=clean(text).match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);if(!m||+m[1]>12||+m[1]<1)return null;return String(+m[1]%12+(/pm/i.test(m[3])?12:0)).padStart(2,'0')+':'+(m[2]||'00');}
export function parseHeartbeat(html,source,now,url) {
 const $=load(html),announcements=[];
 $('h2').each((_,el)=>{const dates=clean($(el).text()); if(!/\b20\d{2}\b/.test(dates)||!dates.includes('|'))return;
 const block=$(el).parent(),title=clean(block.find('p').first().text());if(!title)return;
 const detail=safeUrl(block.find('p a').first().attr('href'),url)||url;
 const ticket=block.find('a').toArray().map(e=>safeUrl($(e).attr('href'),url)).find(u=>u?.includes('universe.com/'))||null;
 announcements.push({id:idFor(source.id,title,dates),sourceId:source.id,company:source.name,title,dateText:dates,sourceUrl:detail,ticketUrl:ticket,checkedAt:now,note:'Season run announced. Individual performance dates and times are not yet verified.'});});
 if(!announcements.length)throw new Error('Season page format changed; no dated productions recognized.');
 return {performances:[],announcements,status:'partial',message:'Season announcements verified; individual performance sessions still require the ticketing feed.'};
}
export function parseBronx(html,source,now,url){
 const $=load(html),announcements=[];
 $('.elementor-widget-text-editor').each((_,el)=>{const block=$(el);const ps=block.find('p');const title=clean(ps.first().text());const dates=ps.toArray().map(e=>clean($(e).text())).find(t=>/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d/i.test(t));if(!dates||!title||title.length>150)return;
 const heading=title.toLowerCase().includes('world premiere')?clean(ps.eq(1).text()):title;
 announcements.push({id:idFor(source.id,heading,dates),sourceId:source.id,company:source.name,title:heading,dateText:dates,sourceUrl:url,checkedAt:now,note:'The source does not confirm a year and performance time. These dates are not shown as bookable performances.'});});
 if(!announcements.length)throw new Error('Season page format changed; no announcements recognized.');
 return {performances:[],announcements,status:'partial',message:'Season announcements found, but year, times and venue need confirmation.'};
}
export function parseNyco(html,source,now,url){
 const $=load(html),performances=[],announcements=[];const blocks=$('[id]').filter((_,e)=>/^e\d+$/.test($(e).attr('id')||''));
 if(!blocks.length)throw new Error('Events page format changed; event sections were not found.');
 blocks.each((_,el)=>{const b=$(el),title=clean(b.find('h3').first().text());const ps=b.find('p');const when=clean(ps.first().text());const location=clean(ps.eq(1).text());if(!title || !/New York|Manhattan|Brooklyn|Bronx|Queens|Staten Island/i.test(location))return;
 const sourceUrl=url+'#'+b.attr('id'),date=dateFromText(when);const venue=when.split('|')[0].trim();
 if(date && /Bryant Park/i.test(venue))performances.push(event(source,{title,date,time:timeFromText(when),venue:'Bryant Park',borough:'Manhattan',neighborhood:'Midtown',sourceUrl,ticketUrl:sourceUrl,kind:'concert',label:'OPERA CONCERT'},now));
 else announcements.push({id:idFor(source.id,b.attr('id')),sourceId:source.id,company:source.name,title,dateText:when,sourceUrl,checkedAt:now,note:'An exact NYC performance date or venue has not yet been verified.'});});
 return {performances,announcements,status:announcements.length?'partial':'live',message:announcements.length?'Some announced programs do not yet have confirmed dates. Overseas performances are excluded.':null};
}
export function bamCandidates(html,base){const $=load(html),map=new Map();$('a[href]').each((_,el)=>{const a=$(el),title=clean(a.find('h3.title').text()),date=dateFromText(a.find('.mobileModuleDate').text()),genre=clean(a.find('.genre').text()),url=safeUrl(a.attr('href'),base);if(title&&date&&/opera/i.test(genre)&&url?.startsWith('https://www.bam.org/'))map.set(url,{title,date,genre,url});});return [...map.values()];}
export function parseBamDetail(html,candidate,source,now){const $=load(html);$('script,style,nav,header,footer').remove();const text=clean($('body').text());
 const screening=/Film|Broadcast/i.test(candidate.genre);if(!/BAM Rose Cinemas/i.test(text)&&screening)throw new Error('BAM screening venue could not be verified');
 // Read screening time from explicit screening text, never from the ticket on-sale time.
 const m=text.match(/screening(?:\s+to follow)?\s+at\s+(\d{1,2}(?::\d{2})?\s*[ap]m)/i);
 const ticket=candidate.url;
 if(!screening)throw new Error('Individual staged-opera venue and sessions require a verified source');
 return event(source,{title:candidate.title,date:candidate.date,time:m?timeFromText(m[1]):null,sourceUrl:candidate.url,ticketUrl:ticket||candidate.url,venue:screening?'BAM Rose Cinemas':null,borough:'Brooklyn',neighborhood:'Fort Greene',kind:screening?'screening':'opera',label:screening?'OPERA SCREENING':'OPERA',runtime:clean(text.match(/RUNNING TIME\s+(.+?)(?=VENUE|TICKET|$)/i)?.[1])||null},now);}
export function parseMetFallback(html,source){const $=load(html);const d=JSON.parse($('#event-data').text());const v=d.venues.find(v=>v.id==='metropolitan-opera');if(!v?.last_scraped)throw new Error('Backup feed has no source verification timestamp');const checked=v.last_scraped;const performances=d.events.filter(e=>e.venue_id===v.id).map(e=>event(source,{sourceId:source.id,title:clean(e.title),date:e.date,time:e.time,venue:'Metropolitan Opera House',borough:'Manhattan',neighborhood:'Lincoln Center',sourceUrl:safeUrl(e.url)||source.url,ticketUrl:safeUrl(e.url)||source.url,provenanceUrl:'https://leporello.app/',verification:'secondary'},checked));if(!performances.length)throw new Error('Backup feed returned no Met performances');return{performances,announcements:[],status:'fallback',verifiedAt:checked,message:'Official calendar could not be read. Using Leporello’s snapshot; the original verification date is preserved.'};}
