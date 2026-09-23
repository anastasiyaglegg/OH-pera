import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {operaIntroduction} from '../lib/opera-content.ts';
test('every bundled performance has an introduction without changing source dates',()=>{
 const data=JSON.parse(readFileSync(new URL('../data/schedule.json',import.meta.url),'utf8'));
 for(const p of data.performances){const before=JSON.stringify(p);const intro=operaIntroduction(p);assert.ok(intro.source||p.description,p.title);assert.ok(!intro.text.includes('not available'),p.title);assert.equal(JSON.stringify(p),before);}
});
test('prefer source description, normalize accented titles and disclose unknown works',()=>{
 assert.equal(operaIntroduction({title:'New work',description:'Presenter description'}).text,'Presenter description');
 assert.equal(operaIntroduction({title:'Così fan tutte (Mozart)',description:null}).text,operaIntroduction({title:'Cosi fan tutte',description:null}).text);
 assert.match(operaIntroduction({title:'New work',description:null}).text,/not available yet/);
 assert.equal(operaIntroduction({title:'constructor',description:null}).source,undefined);
});

test('source freshness flags invalid dates and checks the 48-hour boundary',async()=>{
 const {isStale}=await import('../lib/schedule.ts');
 const now=Date.parse('2026-09-23T12:00:00Z');
 assert.equal(isStale(null,now),true);
 assert.equal(isStale('not a date',now),true);
 assert.equal(isStale('2026-09-21T12:00:00Z',now),false);
 assert.equal(isStale('2026-09-21T11:59:59Z',now),true);
});
