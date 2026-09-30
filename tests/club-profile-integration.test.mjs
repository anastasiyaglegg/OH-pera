import test from 'node:test';
import assert from 'node:assert/strict';
import {createClubFixture,memberId} from './support/club-db.mjs';
test('merged profile APIs share account data without weakening access boundaries',async()=>{
 const {db,as}=await createClubFixture();
 try{
  const old={action:'update',username:'maya_opera',first_name:'Maya',last_name:'Existing',date_of_birth:'1990-01-01',gender:'Woman',about_you:'Existing biography',interests:['Opera Discussion','Dinner before the Opera'],portrait_path:`${memberId(2)}/portrait.jpg`};
  await as(2,'account_profile',old);
  const migrated=await as(2,'profile_get');
  assert.equal(migrated.first_name,'Maya');assert.equal(migrated.last_name,'Existing');assert.equal(migrated.username,'maya_opera');assert.equal(migrated.gender,'woman');assert.equal(migrated.date_of_birth,'1990-01-01');assert.equal(migrated.portrait_path,old.portrait_path);assert.deepEqual(migrated.interests,['discussion','dinner']);
  const edited={username:'maya_new',first_name:'Maya',last_name:'Updated',date_of_birth:'1992-06-12',gender:'self_describe',gender_description:'My description',bio:'Updated biography',interests:['champagne','friendship','dinner'],photos:[]};
  await as(2,'profile_save',edited);
  const canonical=await as(2,'account_profile',{action:'get'});
  assert.equal(canonical.username,'maya_new');assert.equal(canonical.last_name,'Updated');assert.equal(canonical.gender,'My description');assert.equal(canonical.date_of_birth,'1992-06-12');assert.equal(canonical.portrait_path,old.portrait_path);assert.deepEqual(canonical.interests,['Champagne and Chit-Chat','Making friends','Dinner before the Opera']);
  await as(2,'account_profile',{...old,first_name:'Changed using old API'});
  assert.equal((await as(2,'profile_get')).first_name,'Changed using old API');
  const visible=await as(3,'profile_view',{id:memberId(2)});
  for(const key of ['email','date_of_birth','gender','gender_description','username','portrait_path'])assert.equal(key in visible,false);
  await assert.rejects(as(2,'profile_save',{...edited,username:'member_3'}));
  await assert.rejects(as(1,'admin_status',{id:memberId(3),status:'left'}),/direct inviter/);
  await assert.rejects(as(6,'remove_invitee',{id:memberId(3)}));
  await assert.rejects(as(6,'profile_view',{id:memberId(2)}));
  await assert.rejects(as(null,'account_profile',{action:'get'}));
  const columns=await db.query("select column_name from information_schema.columns where table_schema='club_private' and table_name='member_profiles' order by ordinal_position");
  assert.deepEqual(columns.rows.map(row=>row.column_name),['member_id','photos','updated_at']);
 }finally{await db.close();}
});
