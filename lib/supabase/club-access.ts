import {createClient} from '@supabase/supabase-js';

/** Fail closed before any schedule cache lookup. Never trust client membership claims. */
export async function clubAccessStatus(
 authorization:string|null,
 url:string|undefined,
 key:string|undefined,
 makeClient:typeof createClient=createClient,
):Promise<200|401|403|503>{
 if(!authorization?.startsWith('Bearer ')||!authorization.slice(7).trim())return 401;
 if(!url||!key)return 503;
 try{
  const client=makeClient(url,key,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error:authError}=await client.auth.getUser(authorization.slice(7));
  if(authError||!data.user)return 401;
  const {data:member,error}=await client.rpc('club_command',{operation:'me',payload:{}});
  if(error)return 503;
  return member?.status==='active'?200:403;
 }catch{return 503;}
}
