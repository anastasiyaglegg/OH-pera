'use client';
import type {AuthChangeEvent,Session,User} from '@supabase/supabase-js';
import {useEffect,useRef,useState} from 'react';
import {getSupabaseBrowserClient,supabaseConfigured} from '../lib/supabase/client';

type Mode='login'|'create';

export default function AccountMenu(){
 const [mode,setMode]=useState<Mode|null>(null),[user,setUser]=useState<User|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const dialogRef=useRef<HTMLDialogElement>(null);
 const configured=supabaseConfigured();
 useEffect(()=>{const client=getSupabaseBrowserClient();if(!client)return;const {data}=client.auth.onAuthStateChange((_event:AuthChangeEvent,session:Session|null)=>setUser(session?.user??null));return()=>data.subscription.unsubscribe();},[]);
 useEffect(()=>{const dialog=dialogRef.current;if(mode&&!dialog?.open)dialog?.showModal();if(!mode&&dialog?.open)dialog.close();},[mode]);
 const open=(next:Mode)=>{setMessage('');setMode(next);};
 const close=()=>{setMode(null);setMessage('');};
 const google=async()=>{const client=getSupabaseBrowserClient();if(!client){setMessage('Add your Supabase project keys to enable account access.');return;}setBusy(true);const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:`${window.location.origin}/`}});if(error){setMessage(error.message);setBusy(false);}};
 const submit=async(event:React.FormEvent<HTMLFormElement>)=>{event.preventDefault();const client=getSupabaseBrowserClient();if(!client){setMessage('Add your Supabase project keys to enable account access.');return;}const form=new FormData(event.currentTarget),email=String(form.get('email')||''),password=String(form.get('password')||'');setBusy(true);setMessage('');
  if(mode==='create'){
   const confirm=String(form.get('confirmPassword')||'');if(password!==confirm){setMessage('Passwords do not match.');setBusy(false);return;}
   const firstName=String(form.get('firstName')||'').trim(),lastName=String(form.get('lastName')||'').trim();
   const {data,error}=await client.auth.signUp({email,password,options:{data:{first_name:firstName,last_name:lastName,full_name:`${firstName} ${lastName}`.trim()},emailRedirectTo:`${window.location.origin}/`}});
   if(error)setMessage(error.message);else if(data.session){setMessage('Account created. You are signed in.');setMode(null);}else{setMessage('Check your email to confirm your account, then log in below.');setMode('login');}
  }else{
   const {error}=await client.auth.signInWithPassword({email,password});if(error)setMessage(error.message);else setMode(null);
  }
  setBusy(false);
 };
 const signOut=async()=>{setBusy(true);try{const result=await getSupabaseBrowserClient()?.auth.signOut();if(result?.error)setMessage('Sign out failed. Please try again.');}catch{setMessage('Sign out failed. Please try again.');}finally{setBusy(false);}};
 const nameSource=String(user?.user_metadata?.first_name||user?.user_metadata?.full_name||user?.email?.split('@')[0]||'Account');
 const firstName=nameSource.split(/\s+/)[0];
 return <div className="account-menu" aria-label="Account">
  {user&&message&&!mode&&<p role="status">{message}</p>}
  {user?<><span className="account-name">Hello, {firstName}!</span><button type="button" onClick={signOut} disabled={busy}>Sign out</button></>:<><button type="button" onClick={()=>open('login')}>Log in</button><button type="button" className="create-account" onClick={()=>open('create')}>Create account</button></>}
  <dialog ref={dialogRef} className="account-dialog" aria-labelledby="account-title" onCancel={event=>{event.preventDefault();close();}}>
   <button type="button" className="close" onClick={close} aria-label="Close account window">×</button>
   <p className="eyebrow">Your OH-pera account</p><h2 id="account-title">{mode==='create'?'Create an account':'Welcome back'}</h2>
   <p>{mode==='create'?'Save your details securely and prepare for account-based favorites.':'Log in to your OH-pera account.'}</p>
   {!configured&&<p className="auth-notice" role="status">Account forms are ready. Add the Supabase URL and publishable key to <code>.env.local</code> to connect the backend.</p>}
   <form onSubmit={submit}>
    {mode==='create'&&<div className="name-fields"><label>First name<input name="firstName" autoComplete="given-name" required/></label><label>Last name<input name="lastName" autoComplete="family-name" required/></label></div>}
    <label>Email address<input name="email" type="email" autoComplete="email" required/></label>
    <label>Password<input name="password" type="password" autoComplete={mode==='create'?'new-password':'current-password'} minLength={8} required/></label>
    {mode==='create'&&<label>Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required/></label>}
    <button type="submit" className="auth-submit" disabled={busy||!configured}>{busy?'Please wait…':mode==='create'?'Create account':'Log in'}</button>
   </form>
   <div className="auth-divider"><span>or</span></div>
   <button type="button" className="google-login" onClick={google} disabled={busy||!configured}>Continue with Google</button>
   {message&&<p className="auth-message" role="status">{message}</p>}
   <button type="button" className="auth-switch" onClick={()=>open(mode==='create'?'login':'create')}>{mode==='create'?'Already have an account? Log in':'New to OH-pera? Create an account'}</button>
  </dialog>
 </div>;
}
