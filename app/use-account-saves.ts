'use client';
import {useEffect,useRef,useState} from 'react';
import {getSupabaseBrowserClient} from '../lib/supabase/client';
import {readSaved} from '../lib/saved';
import type {Performance} from '../lib/schedule';
import type {AuthChangeEvent,Session} from '@supabase/supabase-js';

const empty=()=>({ids:[] as string[],records:{} as Record<string,Performance>});
export function useAccountSaves(){
 const [saved,setSaved]=useState(empty),[userId,setUserId]=useState<string|null>(null);
 const [loading,setLoading]=useState(false),[message,setMessage]=useState('');
 const owner=useRef<string|null>(null),generation=useRef(0),pending=useRef(false);
 useEffect(()=>{
  const client=getSupabaseBrowserClient();if(!client)return;
  let active=true;
  const sync=(id:string|null)=>{
   if(!active)return;
   const version=++generation.current;owner.current=id;pending.current=false;
   setUserId(id);setSaved(empty());setMessage('');setLoading(Boolean(id));
   if(!id)return;
   // Run outside the auth callback so database work cannot block auth notifications.
   void Promise.resolve().then(async()=>{
    try{
     const {data,error}=await client.from('saved_performances').select('performance_id,performance').eq('user_id',id);
     if(!active||version!==generation.current)return;
     if(error)throw error;
     const rows=(data||[]) as {performance_id:string;performance:unknown}[];
     setSaved(readSaved(JSON.stringify(rows.map(row=>row.performance_id)),JSON.stringify(Object.fromEntries(rows.map(row=>[row.performance_id,row.performance])))));
    }catch{if(active&&version===generation.current)setMessage('Could not load your saved performances. Please try again after the account storage is configured.');}
    finally{if(active&&version===generation.current)setLoading(false);}
   });
  };
  const {data}=client.auth.onAuthStateChange((event:AuthChangeEvent,session:Session|null)=>{
   const id=session?.user.id??null;
   if(event==='INITIAL_SESSION'||id!==owner.current)sync(id);
  });
  return()=>{active=false;generation.current++;data.subscription.unsubscribe();};
 },[]);
 const change=async(performance:Performance|null,id?:string)=>{
  const client=getSupabaseBrowserClient(),account=owner.current;
  if(!client||!account){setMessage('Please log in to save performances to your account.');return;}
  if(pending.current||loading)return;
  pending.current=true;const version=generation.current;setMessage('');
  try{
   const query=performance?client.from('saved_performances').insert({user_id:account,performance_id:performance.id,performance}):id?client.from('saved_performances').delete().eq('user_id',account).eq('performance_id',id):client.from('saved_performances').delete().eq('user_id',account);
   const {error}=await query;
   if(version!==generation.current)return;
   if(error)throw error;
   setSaved(old=>{
    if(performance)return {ids:[...new Set([...old.ids,performance.id])],records:{...old.records,[performance.id]:performance}};
    if(!id)return empty();
    const records={...old.records};delete records[id];return {ids:old.ids.filter(key=>key!==id),records};
   });
  }catch{if(version===generation.current)setMessage('Your saved list could not be updated. Please try again.');}
  finally{if(version===generation.current)pending.current=false;}
 };
 return {favorites:saved.ids,savedRecords:saved.records,userId,loading,message,toggleSave:(p:Performance)=>void change(saved.ids.includes(p.id)?null:p,p.id),removeSaved:(id:string)=>void change(null,id),clearSaved:()=>void change(null)};
}
