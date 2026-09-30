import test from 'node:test';
import assert from 'node:assert/strict';
import {createClubFixture,memberId} from './support/club-db.mjs';

test('direct invitee management enforces ownership and keeps descendants',async t=>{
 const {db,as}=await createClubFixture();
 try{
 await t.test('returns only the direct invitee and rejects unrelated removal',async()=>{
  const state=await as(2,'invitation_state');
  assert.equal(state.invitee.id,memberId(3));assert.equal(state.available,false);
  await assert.rejects(as(2,'remove_invitee',{id:memberId(4),confirmed:true}),/own current invitee/);
  await assert.rejects(as(6,'remove_invitee',{id:memberId(3),confirmed:true}),/own current invitee/);
  await assert.rejects(as(2,'remove_invitee',{id:memberId(3)}),/Confirm removal/);
  await assert.rejects(as(0,'remove_invitee',{id:memberId(3),confirmed:true}),/permission denied/);
 });
 await t.test('an administrator cannot remove a member outside the invitation relationship',async()=>{
  await db.query('update club_private.members set user_id=$1 where id=$1',[memberId(6)]);
  await assert.rejects(as(6,'admin_status',{id:memberId(3),status:'left'}),/Only the direct inviter can remove a member/);
  assert.equal((await as(3,'me')).status,'active');
 });
 await t.test('removal revokes a pending invitation and removed member access',async()=>{
  await as(5,'invite',{email:'friend@example.test'});
  const pending=(await as(5,'invitation_state')).history.find(i=>i.status==='pending');
  await as(4,'remove_invitee',{id:memberId(5),confirmed:true});
  assert.ok((await db.query('select revoked_at from club_private.invitations where id=$1',[pending.id])).rows[0].revoked_at);
  await assert.rejects(as(5,'calendar'),/active (club )?membership/i);
  await assert.rejects(as(5,'invitation_state'),/active (club )?membership/i);
 });
 await t.test('descendants stay active, historical links stay intact, and the invitation slot reopens',async()=>{
  await as(2,'remove_invitee',{id:memberId(3),confirmed:true});
  assert.equal((await as(4,'me')).status,'active');
  assert.equal((await db.query('select inviter_id from club_private.members where id=$1',[memberId(4)])).rows[0].inviter_id,memberId(3));
  const state=await as(2,'invitation_state');assert.equal(state.invitee,null);assert.equal(state.available,true);
  await as(2,'invite',{email:'replacement@example.test'});
  assert.equal((await as(2,'invitation_state')).available,false);
  assert.equal((await db.query("select count(*)::int n from club_private.audit where actor_id=$1 and subject_id=$2 and action='removed_by_inviter'",[memberId(2),memberId(3)])).rows[0].n,1);
  await assert.rejects(as(3,'send',{id:memberId(4),body:'Hello'}),/active (club )?membership/i);
 });
 }finally{await db.close();}
});
