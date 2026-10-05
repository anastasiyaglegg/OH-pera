import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoApi} from '../lib/demo-api.ts';
test('demo journey supports attendance, replies, profile editing and guest acceptance without network',async()=>{
 const original=globalThis.fetch;globalThis.fetch=()=>{throw Error('Demo attempted a network request');};
 try{
 const api=createDemoApi(new Date('2026-10-05T12:00:00Z'));
 await api('attend',{id:'macbeth'});assert.equal((await api('plans')).length,1);
 await api('send',{id:'sofia',body:'Dinner before the opera?'});const thread=await api('thread',{id:'sofia'});assert.equal(thread.messages.at(-2).mine,true);assert.match(thread.messages.at(-1).body,/Demo reply/);
 const profile=await api('profile_get');await api('profile_save',{...profile,bio:'Test bio'});assert.equal((await api('profile_get')).bio,'Test bio');
 const invite=await api('invite',{email:'friend@example.com'});assert.equal(invite.delivery,'unavailable');
 const state=await api('invitation_state');await api('demo_accept',{id:state.history[0].id});assert.equal((await api('invitation_state')).invitees.length,2);assert.equal((await api('calendar'))[0].people.length,3);
 await api('withdraw',{id:'macbeth'});assert.equal((await api('plans')).length,0);
 }finally{globalThis.fetch=original;}
});
test('separate visitors and returned data cannot mutate another demo session',async()=>{
 const a=createDemoApi(),b=createDemoApi();await a('attend',{id:'macbeth'});await a('send',{id:'lina',body:'Hello'});assert.equal((await b('plans')).length,0);assert.equal((await b('thread',{id:'lina'})).messages.length,0);
 const profile=await a('profile_get');profile.bio='Mutated outside';assert.notEqual((await a('profile_get')).bio,profile.bio);
 await assert.rejects(()=>a('delete_real_user'),/not part of the demo/);
});
test('revoked demo invitations cannot be accepted and private profile fields stay private',async()=>{
 const api=createDemoApi();await api('invite',{email:'friend@example.com'});const {history}=await api('invitation_state');await api('revoke',{id:history[0].id});await assert.rejects(()=>api('demo_accept',{id:history[0].id}),/Create a demo invitation/);
 const profile=await api('profile_view',{id:'sofia'});assert.equal(profile.email,undefined);assert.equal(profile.date_of_birth,undefined);
});
