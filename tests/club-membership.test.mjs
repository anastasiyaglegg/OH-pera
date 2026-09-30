import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const sql=readFileSync(new URL('../supabase/migrations/20260929130209_private_club_membership.sql',import.meta.url),'utf8');
const id=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;

test('club membership and actual PostgreSQL access boundaries',async t=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
 await db.exec(sql);
 for(let n=1;n<=10;n++)await db.query('insert into auth.users values($1,$2,now())',[id(n),`member${n}@example.test`]);
 await db.query(`insert into club_private.members(id,user_id,is_admin,display_name,adult_confirmed_at) values($1,$1,true,'Founder',now()),($2,$2,true,'Other founder',now())`,[id(1),id(9)]);
 async function as(n,operation,payload={}){
  await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[n?id(n):'']);
  await db.exec(`set role ${n?'authenticated':'anon'}`);
  try{return (await db.query('select public.club_command($1,$2::jsonb) result',[operation,JSON.stringify(payload)])).rows[0].result;}finally{await db.exec('reset role');}
 }
 async function invite(from,to){return (await as(from,'invite',{email:`member${to}@example.test`})).token;}
 async function accept(n,token){return await as(n,'accept',{token,display_name:`Member ${n}`,adult_confirmed:true});}
 const memberIds={1:id(1),9:id(9)};
 await t.test('anonymous and nonmembers cannot browse connections',async()=>{
  await assert.rejects(as(0,'connections'),/permission denied/);
  assert.deepEqual(await as(2,'me'),{status:'not_member'});
  await assert.rejects(as(2,'connections'),/active club membership/);
 });
 let token=await invite(1,2);
 await t.test('email, adulthood, single pending slot and verified identity enforced',async()=>{
  await assert.rejects(accept(3,token),/verified email/);
  await assert.rejects(as(2,'accept',{token,display_name:'Member 2',adult_confirmed:false}),/18 and over/);
  await assert.rejects(invite(1,3),/pending invitation/);
  await db.query('update auth.users set email_confirmed_at=null where id=$1',[id(2)]);
  await assert.rejects(accept(2,token),/verified email/);
  await db.query('update auth.users set email_confirmed_at=now() where id=$1',[id(2)]);
  memberIds[2]=(await accept(2,token)).id;
  await assert.rejects(accept(2,token),/already have a membership/);
  await assert.rejects(invite(1,3),/allowance is in use/);
 });
 for(const [from,to] of [[2,3],[3,4],[4,5]])memberIds[to]=(await accept(to,await invite(from,to))).id;
 await t.test('exact two-step visibility in both directions, not three or other chain',async()=>{
  const seen=await as(3,'connections');
  assert.deepEqual(new Set(seen.map(x=>x.id)),new Set([memberIds[1],memberIds[2],memberIds[4],memberIds[5]]));
  assert(!(await as(1,'connections')).some(x=>x.id===memberIds[4]));
  assert.deepEqual(await as(9,'connections'),[]);
  assert(seen.every(x=>Object.keys(x).sort().join(',')==='bio,display_name,distance,id'));
 });
 await t.test('clients cannot read raw tables, invoke graph helper or promote themselves',async()=>{
  await db.exec('set role authenticated');
  await assert.rejects(db.query('select * from club_private.members'),/permission denied/);
  await assert.rejects(db.query('select * from club_private.invitations'),/permission denied/);
  await assert.rejects(db.query('select * from club_private.visible_connections($1)',[memberIds[1]]),/permission denied/);
  await db.exec('reset role');
  await assert.rejects(as(2,'admin_status',{id:memberIds[1],status:'left'}),/Administrator/);
 });
 await t.test('blocking is reciprocal and invitation history cannot bypass it',async()=>{
  await as(1,'block',{id:memberIds[2]});
  assert(!(await as(1,'connections')).some(x=>x.id===memberIds[2]));
  assert(!(await as(2,'connections')).some(x=>x.id===memberIds[1]));
  assert.equal((await as(1,'invitation_list')).history[0].member,null);
  await as(1,'unblock',{id:memberIds[2]});
 });
 await t.test('leaving permits replacement but preserves distances and descendants',async()=>{
  await as(1,'admin_status',{id:memberIds[2],status:'left'});
  assert((await as(1,'connections')).some(x=>x.id===memberIds[3]&&x.distance===2));
  assert(!(await as(1,'connections')).some(x=>x.id===memberIds[4]));
  memberIds[6]=(await accept(6,await invite(1,6))).id;
  assert.equal((await as(3,'me')).status,'active');
  await as(1,'admin_status',{id:memberIds[2],status:'active'});
  assert((await as(2,'connections')).some(x=>x.id===memberIds[6]&&x.distance===2));
  await assert.rejects(invite(1,7),/allowance is in use/);
 });
 await t.test('suspension revokes invitations without suspending descendants',async()=>{
  const pending=await invite(5,7);
  await as(1,'admin_status',{id:memberIds[5],status:'suspended'});
  await assert.rejects(accept(7,pending),/unavailable/);
  await assert.rejects(as(5,'connections'),/active club membership/);
  await as(1,'admin_status',{id:memberIds[2],status:'suspended'});
  assert((await as(1,'connections')).some(x=>x.id===memberIds[3]));
  assert.equal((await as(3,'me')).status,'active');
 });
 await t.test('expired and revoked links cannot activate membership; replacement works',async()=>{
  const expired=await invite(9,8);
  await db.query("update club_private.invitations set expires_at=now()-interval '1 second' where inviter_id=$1",[memberIds[9]]);
  await assert.rejects(accept(8,expired),/unavailable/);
  const revoked=await invite(9,8);
  const record=(await as(9,'invitation_list')).history.find(x=>x.status==='pending');
  await as(9,'revoke',{id:record.id});
  await assert.rejects(accept(8,revoked),/unavailable/);
  const fresh=await invite(9,8);await accept(8,fresh);
  await assert.rejects(accept(10,fresh),/unavailable/);
 });
 await t.test('all private tables have RLS and no client table grants',async()=>{
  const tables=await db.query("select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='club_private' and c.relkind='r'");
  assert(tables.rows.length>=4&&tables.rows.every(x=>x.relrowsecurity));
  for(const table of ['members','invitations','blocks','audit'])assert.equal((await db.query("select has_table_privilege('authenticated',$1,'SELECT') ok",[`club_private.${table}`])).rows[0].ok,false);
 });
 }finally{await db.close();}
});
