'use client';
import {useEffect,useRef,useState} from 'react';
import type {ClubApi} from './club-activity';
type Message={id:string;mine:boolean;body:string;created_at:string};
type Thread={messages:Message[];can_message:boolean};
export default function MemberConversation({person,api,onClose}:{person:{id:string;display_name:string};api:ClubApi;onClose:()=>void}){
 const modal=useRef<HTMLDialogElement>(null);
 const [thread,setThread]=useState<Thread|null>(null),[draft,setDraft]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[earlier,setEarlier]=useState(false);
 useEffect(()=>{
  const dialog=modal.current!,opener=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;
  dialog.showModal();document.body.style.overflow='hidden';let active=true,first=true;
  async function load(){try{const next=await api<Thread>('thread',{id:person.id});if(!active)return;
   if(first){setEarlier(next.messages.length===50);first=false;}
   setThread(previous=>{const messages=new Map((previous?.messages||[]).map(m=>[m.id,m]));next.messages.forEach(m=>messages.set(m.id,m));return {...next,messages:[...messages.values()].sort((a,b)=>BigInt(a.id)<BigInt(b.id)?-1:1)};});
   const last=next.messages.at(-1);if(last)await api('mark_read',{id:person.id,through:last.id});
  }catch(e){if(active)setError(e instanceof Error?e.message:'Could not load conversation.');}}
  void load();const timer=setInterval(()=>void load(),10000);
  return()=>{active=false;clearInterval(timer);dialog.close();document.body.style.overflow=overflow;if(opener?.isConnected)opener.focus();};
 },[api,person.id]);
 async function act(task:()=>Promise<void>){setBusy(true);setError('');try{await task();}catch(e){setError(e instanceof Error?e.message:'Please try again.');}finally{setBusy(false);}}
 return <dialog ref={modal} className="club-conversation-dialog" aria-labelledby="member-chat-title" onCancel={onClose}>
  <button className="club-conversation-close" aria-label="Close conversation" onClick={onClose}>×</button>
  <div className="club-chat"><h2 id="member-chat-title">{person.display_name}</h2>{error&&<p role="alert">{error}</p>}
   <div className="club-chat-log" aria-label="Messages">
    {earlier&&thread&&<button disabled={busy} onClick={()=>void act(async()=>{const next=await api<Thread>('thread',{id:person.id,before:thread.messages[0].id});setEarlier(next.messages.length===50);setThread(previous=>previous?{...previous,messages:[...next.messages.filter(m=>!previous.messages.some(p=>p.id===m.id)),...previous.messages]}:next);})}>Load earlier messages</button>}
    {!thread&&!error&&<p role="status">Loading conversation…</p>}{thread?.messages.length===0&&<p>No messages yet. Say hello.</p>}
    {thread?.messages.map(m=><div key={m.id} className={m.mine?'club-message mine':'club-message'}><small>{m.mine?'You':person.display_name}</small><p>{m.body}</p><time dateTime={m.created_at}>{new Date(m.created_at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}</time></div>)}
   </div>
   {thread?.can_message?<form onSubmit={event=>{event.preventDefault();void act(async()=>{await api('send',{id:person.id,body:draft});setDraft('');const next=await api<Thread>('thread',{id:person.id});setThread(previous=>{const messages=new Map((previous?.messages||[]).map(m=>[m.id,m]));next.messages.forEach(m=>messages.set(m.id,m));return {...next,messages:[...messages.values()].sort((a,b)=>BigInt(a.id)<BigInt(b.id)?-1:1)};});});}}><label>Message<textarea value={draft} onChange={event=>setDraft(event.target.value)} maxLength={2000} rows={3} required placeholder="Suggest a time and place to meet…"/></label><button className="club-primary" disabled={busy||!draft.trim()}>Send message</button></form>:thread&&<p>This conversation is read-only. Existing messages are kept.</p>}
  </div>
 </dialog>;
}
