import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mergeCurated,validateCurated} from '../lib/curated.ts';
const allEntries=JSON.parse(readFileSync(new URL('../data/curated.json',import.meta.url),'utf8'));
const entries=[allEntries[0]];
test('all maintained entries pass evidence validation',()=>validateCurated(allEntries));
const item=entries[0];
test('manual entries retain evidence dates and expire without claiming cancellation',()=>{
 const [fresh]=mergeCurated([],entries,'2026-09-23');
 assert.equal(fresh.checkedAt,item.checkedAt);assert.equal(fresh.status,'scheduled');
 assert.equal(mergeCurated([],entries,'2026-10-01')[0].status,'unconfirmed');
 assert.equal(mergeCurated([],entries,'2026-10-28').length,0);
 assert.equal(mergeCurated([],[{...item,status:'cancelled'}],'2026-10-01')[0].status,'cancelled');
});
test('deduplication respects newer automated data and stable IDs',()=>{
 const automatic={...item,id:'auto-1',verification:undefined,checkedAt:'2026-09-01T00:00:00Z'};
 const result=mergeCurated([automatic],entries,'2026-09-23');
 assert.equal(result.length,1);assert.equal(result[0].id,'auto-1');assert.equal(result[0].verification,'manual');
 const newer={...automatic,checkedAt:'2026-09-25T00:00:00Z'};
 assert.equal(mergeCurated([newer],entries,'2026-09-25')[0].verification,undefined);
 assert.equal(mergeCurated(entries,[],'2026-09-23').length,0);
});
test('reject missing evidence, unsafe links, invalid dates and duplicate entries',()=>{
 for(const change of [{evidenceNote:''},{reviewedBy:''},{date:'2026-02-30'},{time:'25:00'},{sourceUrl:'javascript:alert(1)'},{reviewBy:'2020-01-01'},{borough:'Boston'}])assert.throws(()=>validateCurated([{...item,...change}]));
 assert.throws(()=>validateCurated([item,item]));
});
