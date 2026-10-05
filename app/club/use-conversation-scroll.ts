"use client";
import {useLayoutEffect,useRef,type UIEvent} from 'react';

/** Keep scrolling inside the message list, without moving the dialog or page. */
export function useConversationScroll(conversationId:string,messages:readonly {id:string}[]|undefined){
 const logRef=useRef<HTMLDivElement>(null);
 const activeConversation=useRef('');
 const initialized=useRef(false);
 const followLatest=useRef(true);
 const afterSend=useRef(false);
 const prependPosition=useRef<{top:number;height:number}|null>(null);

 useLayoutEffect(()=>{
  if(activeConversation.current!==conversationId||!messages){
   activeConversation.current=conversationId;
   initialized.current=false;
   followLatest.current=true;
   afterSend.current=false;
   prependPosition.current=null;
  }
  const log=logRef.current;
  if(!log||!conversationId||!messages)return;
  const earlier=prependPosition.current;
  if(!initialized.current||afterSend.current){
   log.scrollTop=log.scrollHeight;
  }else if(earlier){
   // Preserve the visible messages when older history is inserted above them.
   log.scrollTop=earlier.top+log.scrollHeight-earlier.height;
  }else if(followLatest.current){
   log.scrollTop=log.scrollHeight;
  }
  initialized.current=true;
  afterSend.current=false;
  prependPosition.current=null;
  followLatest.current=log.scrollHeight-log.clientHeight-log.scrollTop<=48;
 },[conversationId,messages]);

 function onScroll(event:UIEvent<HTMLDivElement>){
  const log=event.currentTarget;
  followLatest.current=log.scrollHeight-log.clientHeight-log.scrollTop<=48;
 }
 function scrollAfterSend(){afterSend.current=true;}
 function preserveBeforePrepend(){
  const log=logRef.current;
  if(log)prependPosition.current={top:log.scrollTop,height:log.scrollHeight};
 }
 return {logRef,onScroll,scrollAfterSend,preserveBeforePrepend};
}
