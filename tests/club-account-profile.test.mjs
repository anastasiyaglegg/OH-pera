import test from 'node:test';
import assert from 'node:assert/strict';
import {createClubFixture} from './support/club-db.mjs';

test('member account profiles keep private details validated and owner-scoped',async()=>{
 const {db,as}=await createClubFixture();
 try{
  const initial=await as(2,'account_profile',{action:'get'});
  assert.equal(initial.username,'member_2');
  assert.equal(initial.first_name,'Maya');

  const updated=await as(2,'account_profile',{
   action:'update',username:'maya_opera',first_name:'Maya',last_name:'Example',date_of_birth:'1990-01-01',gender:'Woman',about_you:'I enjoy a glass of champagne before a Verdi opera.',interests:['Dinner before the Opera','Opera Discussion'],portrait_path:null,
  });
  assert.equal(updated.username,'maya_opera');
  assert.deepEqual(updated.interests,['Dinner before the Opera','Opera Discussion']);
  assert.equal(updated.about_you,'I enjoy a glass of champagne before a Verdi opera.');

  await assert.rejects(as(2,'account_profile',{action:'update',username:'bad name',first_name:'Maya',last_name:'Example',date_of_birth:'2015-01-01',gender:'',about_you:'',interests:['Anything'],portrait_path:null}),/username|18|interests/i);
  await db.exec('set role authenticated');
  await assert.rejects(db.query('select first_name,date_of_birth from club_private.members'),/permission denied/);
  await db.exec('reset role');
 }finally{await db.close();}
});
