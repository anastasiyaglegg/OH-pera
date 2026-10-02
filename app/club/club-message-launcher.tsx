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
 useEffect(()=>{let current=true;const load=async()=>{try{const people=await api<{unread:number}[]>('inbox');if(current)setUnread(people.reduce((sum,person)=>sum+person.unread,0));}catch{if(current)setUnread(null);}};void load();const timer=setInterval(()=>void load(),15000);window.addEventListener('club-messages-read',load);return()=>{current=false;clearInterval(timer);window.removeEventListener('club-messages-read',load);};},[api]);
 return <><button ref={trigger} className="club-message-launcher" onClick={()=>setOpen(true)} aria-haspopup="dialog" aria-expanded={open} aria-label={unread?`Messages, ${unread} unread`:'Messages'} title="Messages"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 4h16v13H9l-5 4V4Z"/><path d="M8 8h8M8 12h6"/></svg>{Boolean(unread)&&<span>{unread!>99?'99+':unread}</span>}</button>{open&&createPortal(<div className="club-app" style={{display:'contents'}}><dialog ref={dialog} className="club-inbox-dialog" aria-label="Messages" onCancel={event=>{event.preventDefault();setOpen(false);}}><button className="club-conversation-close" aria-label="Close messages" onClick={()=>setOpen(false)}>×</button><ClubActivity api={api} view="messages" onView={()=>{}} onPlansCount={ignorePlansCount}/></dialog></div>,document.body)}</>;
}
