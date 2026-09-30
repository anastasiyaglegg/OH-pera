import test from 'node:test';
import assert from 'node:assert/strict';
import {createClubFixture,memberId} from './support/club-db.mjs';
const data={first_name:'Maya',last_name:'Tester',date_of_birth:'1994-05-12',gender:'prefer_not_to_say',gender_description:'',bio:'I love Mozart.',interests:['dinner','discussion','champagne'],photos:[]};
test('member profile permissions and validation',async t=>{
 const {db,as}=await createClubFixture();
 try{
 await t.test('own fields persist, account email cannot be overwritten',async()=>{
  await as(2,'profile_save',data);const own=await as(2,'profile_get');assert.equal(own.last_name,'Tester');assert.equal(own.email,'demo2@example.test');assert.equal(own.date_of_birth,'1994-05-12');assert.deepEqual(own.interests,data.interests);
  await as(2,'profile_save',{...data,interests:['champagne','dinner','champagne','discussion']});assert.deepEqual((await as(2,'profile_get')).interests,['champagne','dinner','discussion']);
  await assert.rejects(as(2,'profile_save',{...data,email:'replacement@example.test'}));await assert.rejects(as(2,'profile_save',{...data,id:memberId(3)}));
 });
 await t.test('connections can view interests but never private attributes',async()=>{
  const profile=await as(3,'profile_view',{id:memberId(2)});assert.equal(profile.display_name,'Maya Tester');assert.ok(profile.interests.includes('dinner'));
  for(const key of ['email','date_of_birth','gender','gender_description','user_id'])assert.equal(key in profile,false);
  await assert.rejects(as(6,'profile_view',{id:memberId(2)}));await assert.rejects(as(5,'profile_view',{id:memberId(2)}));await assert.rejects(as(null,'profile_get'));
 });
 await t.test('blocks and inactive membership deny profile access',async()=>{
  await as(3,'block',{id:memberId(2)});await assert.rejects(as(3,'profile_view',{id:memberId(2)}));await as(3,'unblock',{id:memberId(2)});
  await db.query("update club_private.members set status='suspended' where id=$1",[memberId(6)]);await assert.rejects(as(6,'profile_get'));await assert.rejects(as(6,'profile_save',data));
 });
 await t.test('server rejects underage, malformed, excessive and executable inputs',async()=>{
  for(const patch of [{date_of_birth:'2020-01-01'},{date_of_birth:'2030-01-01'},{date_of_birth:'2000-02-31'},{first_name:' '},{gender:'invalid'},{interests:['unknown']},{interests:['dinner','drinks','discussion','dating','champagne','friendship','extra']},{photos:['data:image/svg+xml;base64,AAAA']},{photos:['https://example.com/photo.jpg']},{photos:['data:image/jpeg;base64,AAAA']},{photos:['x'.repeat(90001)]},{photos:['x','x','x','x']}])await assert.rejects(as(2,'profile_save',{...data,...patch}));
  const own=await as(2,'profile_get');assert.equal(own.first_name,'Maya');assert.deepEqual(own.photos,[]);
 });
 await t.test('private profile table and helper remain inaccessible to anonymous clients',async()=>{
  await db.exec('set role authenticated');await assert.rejects(db.query('select * from club_private.member_profiles'));await db.exec('reset role');
  const r=await db.query("select relrowsecurity from pg_class where oid='club_private.member_profiles'::regclass");assert.equal(r.rows[0].relrowsecurity,true);
 });
 }finally{await db.close();}
});
