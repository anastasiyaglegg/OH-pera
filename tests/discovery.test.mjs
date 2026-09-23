import test from 'node:test';
import assert from 'node:assert/strict';
import {groupProductions,filterEvents,defaultFilters,matchesDate,displayTitle} from '../lib/discovery.ts';
const event={id:'1',sourceId:'met',title:'Così fan tutte (Mozart)',composer:null,kind:'opera',company:'Met',venue:'Met Opera House',borough:'Manhattan',date:'2026-09-26',time:'19:00'};
test('group repeated dates without combining presenters, venues, or screenings',()=>{const groups=groupProductions([event,{...event,id:'2',date:'2026-09-27'},{...event,id:'3',kind:'screening'},{...event,id:'4',sourceId:'bam'},{...event,id:'5',venue:'Other'}]);assert.equal(groups.length,4);assert.equal(groups[0].sessions.length,2);});
test('normalize composer and accented titles for search',()=>{assert.deepEqual(displayTitle(event),{title:'Così fan tutte',composer:'Mozart'});assert.equal(filterEvents([event],{...defaultFilters,q:'cosi'},'2026-09-22').length,1);assert.equal(filterEvents([event],{...defaultFilters,q:'mozart'},'2026-09-22').length,1);});
test('weekend is upcoming Saturday and Sunday, or remaining Sunday',()=>{assert.equal(matchesDate('2026-09-26','2026-09-22','weekend',''),true);assert.equal(matchesDate('2026-09-25','2026-09-22','weekend',''),false);assert.equal(matchesDate('2026-09-27','2026-09-27','weekend',''),true);assert.equal(matchesDate('2026-10-03','2026-09-27','weekend',''),false);});
test('seven day window handles month rollover and excludes eighth day',()=>{assert.equal(matchesDate('2026-10-03','2026-09-27','week',''),true);assert.equal(matchesDate('2026-10-04','2026-09-27','week',''),false);});
test('specific date requires selection and filters compose',()=>{assert.equal(matchesDate(event.date,'2026-09-22','date',''),false);assert.equal(filterEvents([event],{...defaultFilters,range:'date',date:event.date,borough:'Brooklyn'},'2026-09-22').length,0);assert.equal(filterEvents([event],{...defaultFilters,range:'date',date:event.date,kind:'opera'},'2026-09-22').length,1);});

test('venue and company filters compose with dates and preserve unknown venues',()=>{
 const other={...event,id:'2',venue:'Other Hall'};
 const unknown={...event,id:'3',venue:null};
 const filters={...defaultFilters,company:'Met',venue:'Met Opera House',range:'date',date:event.date};
 assert.deepEqual(filterEvents([event,other,unknown],filters,'2026-09-22').map(p=>p.id),['1']);
 assert.equal(filterEvents([event,other,unknown],{...filters,venue:'all'},'2026-09-22').length,3);
 assert.equal(filterEvents([event],{...filters,company:'BAM'},'2026-09-22').length,0);
});
