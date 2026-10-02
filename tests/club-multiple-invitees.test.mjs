import {invitationWords} from '../lib/invitation-words.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createClubFixture,memberId} from './support/club-db.mjs';
test('multiple pending invitations and joined invitees remain independent',async()=>{
 const {db,as}=await createClubFixture();
 try{
  for(const n of [7,8])await db.query('insert into auth.users values($1,$2,now(),$3::jsonb)',[memberId(n),`new${n}@example.test`,JSON.stringify({username:`member_${n}`,first_name:'New',last_name:`Person ${n}`,date_of_birth:'1990-01-01'})]);
  const a=await as(2,'invite',{email:'new7@example.test',secret_word:true}),b=await as(2,'invite',{email:'new8@example.test'});
  assert.notEqual(a.token,b.token);
  assert.ok(invitationWords.includes(a.token));
  assert.match(b.token,/^[a-f0-9]{64}$/);
  await assert.rejects(as(8,'accept',{token:a.token,display_name:'Wrong Recipient',adult_confirmed:true}),/unavailable|verified email/);
  await assert.rejects(as(2,'invite',{email:'NEW7@example.test'}),/pending invitation/);
  await as(7,'accept',{token:a.token,display_name:'New Seven',adult_confirmed:true});
  await as(8,'accept',{token:b.token,display_name:'New Eight',adult_confirmed:true});
  let state=await as(2,'invitation_state');assert.equal(state.invitees.length,3);assert.equal(state.available,true);
  await as(2,'invite',{email:'third@example.test'});await as(2,'invite',{email:'fourth@example.test'});
  state=await as(2,'invitation_state');const pending=state.history.filter(i=>i.status==='pending');assert.equal(pending.length,2);
  await as(2,'revoke',{id:pending[0].id});
  assert.equal((await as(2,'invitation_state')).history.filter(i=>i.status==='pending').length,1);
  await as(2,'remove_invitee',{id:state.invitees.find(i=>i.id!==memberId(3)).id,confirmed:true});
  assert.equal((await as(2,'invitation_state')).invitees.length,2);
  assert.equal((await as(2,'invitation_state')).history.filter(i=>i.status==='pending').length,1);
 }finally{await db.close();}
});
