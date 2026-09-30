import test from 'node:test';
import assert from 'node:assert/strict';
import {clubAccessStatus} from '../lib/supabase/club-access.ts';
const url='https://example.supabase.co';
function clientFor(status, {invalid=false, failure=false}={}){
 return (_url,_key,options)=>{
  assert.equal(options.global.headers.Authorization,'Bearer test-token');
  assert.equal(options.auth.persistSession,false);
  return {auth:{getUser:async token=>{assert.equal(token,'test-token');return {data:{user:invalid?null:{id:'verified-user'}},error:null};}},rpc:async(name,args)=>{assert.equal(invalid,false,'invalid tokens must never query membership');assert.equal(name,'club_command');assert.deepEqual(args,{operation:'me',payload:{}});return {data:{status},error:failure?new Error('offline'):null};}};
 };
}
test('calendar denies missing or malformed authentication before creating a client',async()=>{
 for(const value of [null,'','Basic token','Bearer '])assert.equal(await clubAccessStatus(value,url,'public-key',()=>{throw Error('unexpected client');}),401);
});
test('calendar denies inactive membership and invalid identity, permits only verified active members',async()=>{
 for(const status of ['not_member','suspended','left',undefined])assert.equal(await clubAccessStatus('Bearer test-token',url,'public-key',clientFor(status)),403);
 assert.equal(await clubAccessStatus('Bearer test-token',url,'public-key',clientFor('active',{invalid:true})),401);
 assert.equal(await clubAccessStatus('Bearer test-token',url,'public-key',clientFor('active')),200);
});
test('calendar fails closed when configuration or membership service is unavailable',async()=>{
 assert.equal(await clubAccessStatus('Bearer test-token',undefined,undefined),503);
 assert.equal(await clubAccessStatus('Bearer test-token',url,'public-key',clientFor('active',{failure:true})),503);
 assert.equal(await clubAccessStatus('Bearer test-token',url,'public-key',()=>{throw Error('offline');}),503);
});
