import {trustedUrl} from './security.ts';
export async function readLimitedText(response:Response,maxBytes:number):Promise<string>{
 if(Number(response.headers.get('content-length'))>maxBytes){await response.body?.cancel();throw Error('Response exceeds size limit');}
 if(!response.body)return '';
 const reader=response.body.getReader(),decoder=new TextDecoder();let size=0,text='';
 try {while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw Error('Response exceeds size limit');}text+=decoder.decode(value,{stream:true});}return text+decoder.decode();}finally{reader.releaseLock();}
}
export async function fetchTrustedText(url:string,hosts:readonly string[],maxBytes=6000000,fetcher:typeof fetch=fetch){
 const signal=AbortSignal.timeout(25000);let current=url;
 for(let hop=0;hop<4;hop++){
  const safe=trustedUrl(current,hosts);if(!safe)throw Error('Unapproved source destination');
  const response=await fetcher(safe,{redirect:'manual',signal,headers:{'User-Agent':'OH-pera/1.0 (NYC opera schedules)','Accept':'text/html,application/json'}});
  if([301,302,303,307,308].includes(response.status)){
   const next=response.headers.get('location');await response.body?.cancel();
   if(!next)throw Error('Missing redirect destination');current=new URL(next,safe).href;continue;
  }
  if(!response.ok){await response.body?.cancel();throw Error(`Source returned HTTP ${response.status}`);}
  return readLimitedText(response,maxBytes);
 }
 throw Error('Too many source redirects');
}
