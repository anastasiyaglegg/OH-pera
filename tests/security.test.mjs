import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {trustedUrl,listingUrl,validPerformance,validSchedule} from '../lib/security.ts';
import {readLimitedText,fetchTrustedText} from '../lib/safe-fetch.ts';
import {readSaved} from '../lib/saved.ts';
const snapshot=JSON.parse(readFileSync(new URL('../data/schedule.json',import.meta.url)));
const item=snapshot.performances[0];
test('all bundled and curated data passes the strict external-data boundary',()=>{
 assert.equal(validSchedule(snapshot),true);
 for(const p of JSON.parse(readFileSync(new URL('../data/curated.json',import.meta.url))))assert.equal(validPerformance(p),true,p.id);
});
test('reject deceptive, credential-bearing, private, and executable URL destinations',()=>{
 for(const url of ['javascript:alert(1)','data:text/html,test','https://www.metopera.org.evil.example/','https://www.metopera.org@evil.example/','https://evil.example/?next=https://www.metopera.org','https://127.0.0.1/','https://[::1]/','https://www.metopera.org:8443/','https://www.metopera.org/\nfoo','https://www.metopera.org\\@evil.example'])assert.equal(listingUrl(url,'met'),null,url);
 assert.equal(listingUrl('https://www.bam.org/','met'),null);
 assert.equal(listingUrl('https://www.metopera.org/','constructor'),null);
 assert.ok(listingUrl('https://www.universe.com/events/test','heartbeat','ticket'));
 assert.equal(listingUrl('https://www.universe.com/events/test','heartbeat'),null);
 assert.equal(trustedUrl('/season',['www.metopera.org'],'https://www.metopera.org/'),'https://www.metopera.org/season');
});
test('validate fields rendered or used as links, not merely outer arrays',()=>{
 for(const change of [{description:{}},{composer:[]},{date:'2026-02-30'},{checkedAt:'bad'},{title:'x'.repeat(501)},{provenanceUrl:'javascript:alert(1)'},{ticketUrl:'https://evil.example/'},{sourceId:'constructor'},{reviewBy:'2026-02-30'}])assert.equal(validPerformance({...item,...change}),false,JSON.stringify(change));
 assert.equal(validSchedule({...snapshot,performances:[item,item]}),false);
 assert.equal(validSchedule({...snapshot,performances:Array(5001).fill(item)}),false);
 assert.equal(validSchedule({...snapshot,announcements:[{...snapshot.announcements[0],ticketUrl:'javascript:alert(1)'}]}),false);
});
test('saved storage survives malformed JSON and discards invalid records',()=>{
 assert.deepEqual(readSaved('{','{}'),{ids:[],records:{}});
 assert.deepEqual(readSaved('[]','x'.repeat(2000001)),{ids:[],records:{}});
 const result=readSaved(JSON.stringify([item.id,item.id,'__proto__']),JSON.stringify({[item.id]:{...item,title:{bad:true}}}));
 assert.deepEqual(result,{ids:[item.id],records:{}});
 assert.equal(readSaved(JSON.stringify([item.id]),JSON.stringify({[item.id]:item})).records[item.id].title,item.title);
});
test('reject excessive responses before buffering them, even with no Content-Length',async()=>{
 await assert.rejects(readLimitedText(new Response('x',{headers:{'content-length':'500'}}),100),/size limit/);
 let cancelled=false;
 const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array(101));},cancel(){cancelled=true;}});
 await assert.rejects(readLimitedText(new Response(stream),100),/size limit/);assert.equal(cancelled,true);
 assert.equal(await readLimitedText(new Response('é'),2),'é');
});
test('validate every redirect before issuing another source request',async()=>{
 const calls=[];
 const fake=async(url,options)=>{calls.push(url);assert.equal(options.redirect,'manual');return new Response(null,{status:302,headers:{location:'http://169.254.169.254/latest/meta-data/'}});};
 await assert.rejects(fetchTrustedText('https://www.metopera.org/',['www.metopera.org'],100,fake),/Unapproved/);
 assert.equal(calls.length,1);
});
test('allow same-host redirects, bound loops, and reject unknown initial hosts',async()=>{
 let calls=0;
 const ok=async()=>++calls===1?new Response(null,{status:302,headers:{location:'/new'}}):new Response('ok');
 assert.equal(await fetchTrustedText('https://www.metopera.org/',['www.metopera.org'],100,ok),'ok');
 calls=0;
 await assert.rejects(fetchTrustedText('https://evil.example/',['www.metopera.org'],100,ok),/Unapproved/);assert.equal(calls,0);
 await assert.rejects(fetchTrustedText('https://www.metopera.org/',['www.metopera.org'],100,async()=>{calls++;return new Response(null,{status:302,headers:{location:'/loop'}});}),/Too many/);assert.equal(calls,4);
});
