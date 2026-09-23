import {readFile} from 'node:fs/promises';
import {nycToday} from './lib/core.mjs';
const snapshot=JSON.parse(await readFile(new URL('../data/schedule.json',import.meta.url),'utf8'));
const today=nycToday();
const end=new Date(Date.parse(today+'T12:00:00Z')+60*86400000).toISOString().slice(0,10);
const within=snapshot.performances.filter(p=>p.date>=today&&p.date<end);
console.log(`Snapshot: ${snapshot.generatedAt}\nWindow: ${today} to ${end} (exclusive)`);
const staged=new Set();
for(const source of snapshot.sources){
 const dates=within.filter(p=>p.sourceId===source.id);
 const stage=dates.filter(p=>p.kind==='opera'&&p.status==='scheduled');
 if(stage.length)staged.add(source.id);
 const stale=dates.filter(p=>!Number.isFinite(Date.parse(p.checkedAt))||Date.now()-Date.parse(p.checkedAt)>48*3600000).length;
 console.log(`${source.name}: ${stage.length} staged dates; ${dates.filter(p=>p.kind==='screening').length} screenings; ${stale} older dates; ${source.status}`);
 if(source.message)console.log(`  ${source.message}`);
}
console.log(`Companies with scheduled staged dates: ${staged.size} / 3 proposed minimum (not an accuracy verification).`);
console.log('Coverage percentage: NOT VERIFIED. An official-date inventory and manual reconciliation are required.');
