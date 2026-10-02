import test from 'node:test';
import assert from 'node:assert/strict';
import {sendInvitationEmail} from '../lib/invitation-email.ts';
import {invitationRequest} from '../lib/invitation-request.ts';
const token='a'.repeat(64);
const config={apiKey:'test-key',from:'OH-pera <invitations@oh-pera.com>',siteUrl:'https://oh-pera.vercel.app',supabaseUrl:'https://example.supabase.co',supabaseKey:'public-key'};
test('mail sends only the invited recipient and does not expose the code in the URL or idempotency key',async()=>{
 let previous;
 const mock=async(url,options)=>{assert.equal(url,'https://api.resend.com/emails');const body=JSON.parse(options.body);assert.deepEqual(body.to,['friend@example.com']);assert.ok(body.text.includes('AAAAAAAA-AAAAAAAA'));assert.ok(!options.headers['Idempotency-Key'].includes(token));assert.doesNotMatch(body.html, /<a\b|href\s*=|https?:\/\//i);assert.doesNotMatch(body.text, /https?:\/\//i);assert.ok(body.text.includes('Register with an invitation'));if(previous)assert.equal(previous,options.headers['Idempotency-Key']);previous=options.headers['Idempotency-Key'];return Response.json({id:'email-id'});};
 assert.equal(await sendInvitationEmail('friend@example.com',token,config,mock),'queued');
 assert.equal(await sendInvitationEmail('friend@example.com',token,config,mock),'queued');
});
test('missing config, provider rejection and network failure never claim email queued',async()=>{
 assert.equal(await sendInvitationEmail('a@b.com',token,{},()=>{throw Error('unexpected');}),'unavailable');
 assert.equal(await sendInvitationEmail('a@b.com',token,config,async()=>new Response('',{status:403})),'failed');
 assert.equal(await sendInvitationEmail('a@b.com',token,config,async()=>{throw Error('timeout');}),'failed');
});
const req=(auth=true)=>new Request('https://example.com/api/invitations',{method:'POST',headers:auth?{Authorization:'Bearer user-token'}:{},body:JSON.stringify({email:' Friend@Example.com ',token:'untrusted-token',from:'attacker@example.com'})});
const fakeClient=(error=null)=>(_url,_key,options)=>{assert.equal(options.global.headers.Authorization,'Bearer user-token');return {rpc:async(name,args)=>{assert.equal(name,'club_command');assert.deepEqual(args,{operation:'invite',payload:{email:'friend@example.com',secret_word:true}});return {data:{token},error};}};};
test('unauthenticated or database-denied invitations never send email',async()=>{
 const noSend=()=>{throw Error('must not send');};
 assert.equal((await invitationRequest(req(false),config,()=>{throw Error('must not connect');},noSend)).status,401);
 assert.equal((await invitationRequest(req(),config,fakeClient({code:'P0001',message:'Allowance used'}),noSend)).status,400);
});
test('authorized creation passes server-generated token and preserves code after delivery failure',async()=>{
 const response=await invitationRequest(req(),config,fakeClient(),async(email,code)=>{assert.equal(email,'friend@example.com');assert.equal(code,token);return 'failed';});
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.deepEqual(await response.json(),{token,delivery:'failed'});
});

test('secret word email contains no links, recipient addresses, or long legacy code',async()=>{
 const word='sonata';
 assert.equal(await sendInvitationEmail('friend@example.com',word,config,async(_url,options)=>{
  const body=JSON.parse(options.body);
  for(const content of [body.text,body.html]){
   assert.ok(content.includes(word));
   assert.doesNotMatch(content,/<a\b|href\s*=|https?:\/\/|friend@example\.com/i);
  }
  return Response.json({id:'word-email'});
 }),'queued');
});
