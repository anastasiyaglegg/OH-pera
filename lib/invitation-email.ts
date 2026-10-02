import {isInvitationCode,formatInvitationCode} from './invitation-code.ts';
export type Delivery='queued'|'unavailable'|'failed';
export type EmailConfig={apiKey?:string;from?:string;siteUrl?:string};
/** Server-only. Never log recipient data, provider responses, or invitation secrets. */
export async function sendInvitationEmail(email:string,token:string,config:EmailConfig,send:typeof fetch=fetch):Promise<Delivery>{
 if(!config.apiKey||!config.from||!config.siteUrl)return 'unavailable';
 try{const site=new URL(config.siteUrl);if(site.protocol!=='https:'||site.username||site.password)return 'unavailable';}catch{return 'unavailable';}
 if(!isInvitationCode(token))return 'failed';
 const code=formatInvitationCode(token);
 const text=`You’re invited to OH-pera!\n\nFind an opera, see who’s going, and make plans with your circle.\n\nOpen OH-pera, choose Register with an invitation, and enter this secret word:\n\n${code}\n\nUse the email address that received this invitation. This secret word expires in seven days and works once. If you weren’t expecting this invitation, you can ignore it.`;
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(email+':'+token));
 const id=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
 try{
  const response=await send('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${config.apiKey}`,'Content-Type':'application/json','Idempotency-Key':`invitation-${id}`},signal:AbortSignal.timeout(10000),body:JSON.stringify({from:config.from,to:[email],subject:'Your invitation to OH-pera',text,html:`<div style="background:#faf7f1;color:#30252a;padding:32px;font:16px/1.6 Arial,sans-serif"><div style="max-width:520px;margin:auto"><h1 style="font:32px Georgia,serif;color:#806019">You’re invited to OH-pera!</h1><p>Find an opera, see who’s going, and make plans with your circle.</p><p>Open OH-pera, choose <strong>Register with an invitation</strong>, and enter your secret word:</p><p style="border:1px solid #d6b577;border-radius:16px;padding:16px;word-break:break-all">${code}</p><p>Use the email address that received this invitation. This secret word expires in seven days and works once.</p><p style="font-size:13px">If you weren’t expecting this invitation, you can ignore it.</p></div></div>`})});
  if(!response.ok)return 'failed';
  const result=await response.json() as {id?:unknown};return typeof result.id==='string'&&result.id?'queued':'failed';
 }catch{return 'failed';}
}
