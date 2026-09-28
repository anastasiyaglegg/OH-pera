import test from 'node:test';
import assert from 'node:assert/strict';
import {queueSave,readQueuedSave,takeQueuedSave,cancelQueuedSave} from '../lib/pending-save.ts';
function storage(){const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};}
test('login continuation consumes the selected performance once',()=>{
 const s=storage();queueSave('met-first',s,1000);assert.equal(readQueuedSave(s,1001),'met-first');
 assert.equal(takeQueuedSave(s,1002),'met-first');assert.equal(takeQueuedSave(s,1003),null);
});
test('cancelled and expired login intents never save into a later session',()=>{
 const s=storage();queueSave('met-first',s,1000);cancelQueuedSave(s);assert.equal(takeQueuedSave(s,1001),null);
 queueSave('met-first',s,1000);assert.equal(takeQueuedSave(s,901000),null);
});
test('a new selection replaces the previous pending save',()=>{
 const s=storage();queueSave('met-first',s,1000);queueSave('bam-next',s,1001);assert.equal(takeQueuedSave(s,1002),'bam-next');
});
test('malformed or future-dated continuation data is ignored',()=>{
 const s=storage();cancelQueuedSave(s);s.setItem('ohpera-pending-save','{broken');assert.equal(readQueuedSave(s,1000),null);
 s.setItem('ohpera-pending-save',JSON.stringify({id:'met-first',at:2000}));assert.equal(takeQueuedSave(s,1000),null);
});
