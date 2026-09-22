import {DatabaseSync} from 'node:sqlite';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {SOURCES,mergeSource,nycToday} from './lib/core.mjs';
import {collect} from './lib/connectors.mjs';
const now=new Date().toISOString();
let previous={performances:[],announcements:[],sources:[]};
try{previous=JSON.parse(await readFile('data/schedule.json','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
await mkdir('.data',{recursive:true});await mkdir('data',{recursive:true});
const db=new DatabaseSync('.data/schedules.sqlite');
db.exec('CREATE TABLE IF NOT EXISTS source_snapshots (id TEXT PRIMARY KEY, payload TEXT NOT NULL, attempted_at TEXT NOT NULL)');
const put=db.prepare('INSERT INTO source_snapshots(id,payload,attempted_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,attempted_at=excluded.attempted_at');
const results=await Promise.all(SOURCES.map(async source=>{try{return {source,result:await collect(source,now)}}catch(e){return{source,result:{error:String(e.message).slice(0,350)}}}}));
const snapshot={schemaVersion:1,generatedAt:now,timezone:'America/New_York',coverage:'Five configured organizations; incomplete citywide coverage.',performances:[],announcements:[],sources:[]};
for(const {source,result} of results){const merged=mergeSource(previous,result,source,now);put.run(source.id,JSON.stringify(merged),now);snapshot.performances.push(...merged.performances);snapshot.announcements.push(...merged.announcements);snapshot.sources.push(merged.source);console.log(`${source.name}: ${merged.source.status}; ${merged.performances.length} dated listings; ${merged.announcements.length} announcements`);}
snapshot.performances=snapshot.performances.filter(e=>e.date>=nycToday()).sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'99:99').localeCompare(b.time||'99:99'));
await writeFile('data/schedule.json.tmp',JSON.stringify(snapshot,null,2)+'\n');await rename('data/schedule.json.tmp','data/schedule.json');db.close();
console.log(`Saved ${snapshot.performances.length} upcoming listings. Source problems remain visible in the coverage panel.`);
if(snapshot.sources.every(s=>s.status==='error'))process.exitCode=1;
