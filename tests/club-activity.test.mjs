import test from 'node:test';
import assert from 'node:assert/strict';
import {createClubFixture,memberId} from './support/club-db.mjs';
test('attendance and private messaging enforce server-side club boundaries',async t=>{
 const {db,as,performances}=await createClubFixture();
 try{
 await t.test('anonymous denied; total includes anonymous outsiders but names stop at two edges',async()=>{
  await assert.rejects(as(0,'calendar'),/permission denied/);
  const event=(await as(2,'calendar'))[0];assert.equal(event.total,5);assert.equal(event.mine,null);
  assert.deepEqual(new Set(event.people.map(x=>x.id)),new Set([memberId(1),memberId(3),memberId(4)]));
  assert(!JSON.stringify(event).includes('Noah'));assert(!JSON.stringify(event).includes('Elena'));
  await as(2,'attend',{id:event.performance.id,revision:1});await as(2,'attend',{id:event.performance.id,revision:1});
  assert.equal((await as(2,'calendar'))[0].total,6);assert.equal((await as(2,'plans')).length,1);
  await as(2,'withdraw',{id:event.performance.id});assert.equal((await as(2,'calendar'))[0].total,5);
 });
 await t.test('attendance names include inviter and two descendants, never inviter’s inviter',async()=>{
  const event=(await as(3,'calendar'))[0];
  assert.equal(event.total,5);
  assert.deepEqual(new Set(event.people.map(x=>x.id)),new Set([memberId(4),memberId(5)]));
  assert(!JSON.stringify(event.people).includes('Sofia'));
  assert.equal(event.people.find(x=>x.id===memberId(5)).relationship,'Your invitee’s invitee');
  const maya=(await as(2,'calendar'))[0];
  assert.equal(maya.people.find(x=>x.id===memberId(1)).relationship,'Your inviter');
 });
 await t.test('second-degree chat allowed; third-degree and other chain denied',async()=>{
  await as(2,'send',{id:memberId(4),body:'Hello Lina'});
  await assert.rejects(as(2,'send',{id:memberId(5),body:'No'}),/not available/);
  await assert.rejects(as(2,'thread',{id:memberId(6)}),/unavailable/);
  assert.equal((await as(4,'thread',{id:memberId(2)})).messages[0].body,'Hello Lina');
  await assert.rejects(as(2,'send',{id:memberId(3),body:'   '}),/1–2000/);
 });
 await t.test('unread acknowledgments are owner-scoped; no read receipts leak',async()=>{
  assert.equal((await as(2,'inbox')).find(x=>x.id===memberId(3)).unread,1);
  const thread=await as(2,'thread',{id:memberId(3)});
  assert(!JSON.stringify(thread).includes('read_at'));
  await as(2,'mark_read',{id:memberId(3),through:thread.messages.at(-1).id});
  assert.equal((await as(2,'inbox')).find(x=>x.id===memberId(3)).unread,0);
 });
 await t.test('blocking hides names and disables new messages but keeps participant history',async()=>{
  await as(2,'block',{id:memberId(3)});
  assert(!(await as(2,'calendar'))[0].people.some(x=>x.id===memberId(3)));
  assert.equal((await as(2,'calendar'))[0].total,5);
  await assert.rejects(as(3,'send',{id:memberId(2),body:'Blocked'}),/not available/);
  const thread=await as(2,'thread',{id:memberId(3)});assert.equal(thread.can_message,false);assert.equal(thread.messages.length,1);
  await as(2,'unblock',{id:memberId(3)});
 });
 await t.test('changed details require explicit reconfirmation and cancelled events retain own plans',async()=>{
  await as(2,'attend',{id:performances[0].id,revision:1});
  const changed={...performances[0],time:'20:00'};
  await db.query('select club_private.sync_schedule($1::jsonb)',[JSON.stringify([changed])]);
  let event=(await as(2,'calendar'))[0];assert.equal(event.total,0);assert.equal(event.mine,'reconfirm');
  await assert.rejects(as(2,'attend',{id:changed.id,revision:1}),/changed/);
  await as(2,'attend',{id:changed.id,revision:2});assert.equal((await as(2,'calendar'))[0].total,1);
  await db.query('select club_private.sync_schedule($1::jsonb)',[JSON.stringify([{...changed,status:'cancelled'}])]);
  assert.equal((await as(2,'plans'))[0].mine,'cancelled');
  await assert.rejects(as(2,'attend',{id:changed.id,revision:3}),/closed/);
 });
 await t.test('past attendance never discloses another member',async()=>{
  await db.query("update club_private.performances set day='2000-01-01',snapshot=jsonb_set(snapshot,'{date}','\"2000-01-01\"') where id=$1",[performances[0].id]);
  const past=(await as(2,'plans'))[0];assert.deepEqual(past.people,[]);assert.equal(past.total,0);
 });
 await t.test('former participants retain history only and private tables remain inaccessible',async()=>{
  await as(2,'remove_invitee',{id:memberId(3),confirmed:true});
  assert.equal((await as(2,'inbox')).find(x=>x.id===memberId(3)).display_name,'Former member');
  await assert.rejects(as(3,'inbox'),/Active membership/);
  await db.exec('set role authenticated');
  for(const table of ['attendance','messages','performances'])await assert.rejects(db.query(`select * from club_private.${table}`),/permission denied/);
  await assert.rejects(db.query("select public.club_sync_schedule('[]'::jsonb)"),/permission denied/);
  await db.exec('reset role');
 });
 }finally{await db.close();}
});
