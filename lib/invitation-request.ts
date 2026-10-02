import {isInvitationCode} from './invitation-code.ts';
import {createClient} from '@supabase/supabase-js';
import {sendInvitationEmail,type EmailConfig} from './invitation-email.ts';
type Config=EmailConfig&{supabaseUrl?:string;supabaseKey?:string};
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
export async function invitationRequest(request:Request,config:Config,makeClient:typeof createClient=createClient,send:typeof sendInvitationEmail=sendInvitationEmail){
 const authorization=request.headers.get('authorization');
 if(!authorization?.startsWith('Bearer ')||!authorization.slice(7).trim())return Response.json({error:'Sign in required.'},{status:401,headers});
 if(!config.supabaseUrl||!config.supabaseKey)return Response.json({error:'Account access is unavailable.'},{status:503,headers});
 let email:string;
 try{const body=await request.text();if(body.length>1024)throw Error();const payload=JSON.parse(body);email=typeof payload.email==='string'?payload.email.trim().toLowerCase():'';if(email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error();}catch{return Response.json({error:'Enter a valid email address.'},{status:400,headers});}
 try{
  const client=makeClient(config.supabaseUrl,config.supabaseKey,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  // The caller's own JWT preserves the RPC's verified-member and recipient checks.
  const {data,error}=await client.rpc('club_command',{operation:'invite',payload:{email,secret_word:true}});
  if(error)return Response.json({error:error.code==='P0001'?error.message:'Invitation could not be created.'},{status:400,headers});
  if(!data||typeof data.token!=='string'||!isInvitationCode(data.token))throw Error();
  let delivery:'queued'|'unavailable'|'failed'='failed';
  try{delivery=await send(email,data.token,config);}catch{/* Preserve the created code for manual recovery. */}
  return Response.json({...data,delivery},{headers});
 }catch{return Response.json({error:'Invitation service unavailable. Check your invitation list before trying again.'},{status:503,headers});}
}
