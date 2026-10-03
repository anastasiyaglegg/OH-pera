 'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import ClubActivity from './club-activity';
const ignorePlansCount=()=>{};
import type {ClubApi} from './club-activity';
export default function ClubMessageLauncher({api}:{api:ClubApi}){
 const [open,setOpen]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(!open)return;const modal=dialog.current!,opener=trigger.current;const overflow=document.body.style.overflow;modal.showModal();document.body.style.overflow='hidden';return()=>{modal.close();document.body.style.overflow=overflow;opener?.focus({preventScroll:true});};},[open]);
 const [unread,setUnread]=useState<number|null>(null);
 const audio=useRef<AudioContext|null>(null);
 useEffect(()=>{
  const enableSound=()=>{try{audio.current??=new AudioContext();if(audio.current.state==='suspended')void audio.current.resume().catch(()=>{});}catch{/* Sound is optional when audio is unavailable. */}};
  window.addEventListener('pointerdown',enableSound);window.addEventListener('keydown',enableSound);
  return()=>{window.removeEventListener('pointerdown',enableSound);window.removeEventListener('keydown',enableSound);const context=audio.current;audio.current=null;if(context)void context.close().catch(()=>{});};
 },[]);
 useEffect(()=>{let current=true,loading=false;let previous:Map<string,number>|null=null;
  const load=async()=>{if(loading)return;loading=true;try{
   const people=await api<{id:string;unread:number}[]>('inbox');if(!current)return;
   setUnread(people.reduce((sum,person)=>sum+person.unread,0));
   const hasNewMessage=previous!==null&&people.some(person=>person.unread>(previous!.get(person.id)??0));
   previous=new Map(people.map(person=>[person.id,person.unread]));
   const context=audio.current;
   if(hasNewMessage&&context?.state==='running'){
    const tone=context.createOscillator(),volume=context.createGain(),now=context.currentTime;
    tone.type='sine';tone.frequency.setValueAtTime(880,now);tone.frequency.setValueAtTime(1100,now+0.12);
    volume.gain.setValueAtTime(0,now);volume.gain.linearRampToValueAtTime(0.12,now+0.01);volume.gain.exponentialRampToValueAtTime(0.001,now+0.3);
    tone.connect(volume);volume.connect(context.destination);tone.onended=()=>{tone.disconnect();volume.disconnect();};tone.start(now);tone.stop(now+0.32);
   }
  }catch{if(current)setUnread(null);}finally{loading=false;}};
  void load();const timer=setInterval(()=>void load(),5000);window.addEventListener('club-messages-read',load);
  return()=>{current=false;clearInterval(timer);window.removeEventListener('club-messages-read',load);};
 },[api]);
 return <><button ref={trigger} className="club-message-launcher" onClick={()=>setOpen(true)} aria-haspopup="dialog" aria-expanded={open} aria-label={unread?`Messages, ${unread} unread`:'Messages'} title="Messages"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 4h16v13H9l-5 4V4Z"/><path d="M8 8h8M8 12h6"/></svg>{Boolean(unread)&&<span>{unread!>99?'99+':unread}</span>}</button>{open&&createPortal(<div className="club-app" style={{display:'contents'}}><dialog ref={dialog} className="club-inbox-dialog" aria-label="Messages" onCancel={event=>{event.preventDefault();setOpen(false);}}><button className="club-conversation-close" aria-label="Close messages" onClick={()=>setOpen(false)}>×</button><ClubActivity api={api} view="messages" onView={()=>{}} onPlansCount={ignorePlansCount}/></dialog></div>,document.body)}</>;
}
