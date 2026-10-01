'use client';
import ClubIntroduction from './club-introduction';
import ClubMemberPages from './club-member-pages';
import ClubHeader from './club-header';
import Link from 'next/link';
import Image from 'next/image';
import {useEffect,useRef,useState} from 'react';
import type {AuthChangeEvent,Session} from '@supabase/supabase-js';
import {getSupabaseBrowserClient,supabaseConfigured} from '../../lib/supabase/client';

type Member={id?:string;status:'active'|'left'|'suspended'|'not_member';display_name?:string;bio?:string};
type View='calendar'|'plans'|'messages'|'connections'|'invitation'|'profile';
const TOKEN_KEY='ohpera-club-invitation';
async function command<T>(operation:string,payload:Record<string,unknown>={}):Promise<T>{
 const client=getSupabaseBrowserClient();if(!client)throw new Error('Account access is not available yet. Please try again later.');
 const {data,error}=await client.rpc('club_command',{operation,payload});
 if(error)throw new Error(error.code==='P0001'?error.message:'Club access could not be verified. Please try again.');
 if(operation==='profile_get'&&data?.portrait_path){
  const {data:portrait}=await client.storage.from('club-portraits').createSignedUrl(data.portrait_path,3600);
  return {...data,portrait_url:portrait?.signedUrl||null} as T;
 }
 return data as T;
}

export default function ClubClient(){
 const [plansCount,setPlansCount]=useState<number|null>(null);
 const [session,setSession]=useState<Session|null>(null),[authReady,setAuthReady]=useState(false);
 const [member,setMember]=useState<Member|null>(null),[checking,setChecking]=useState(false),[revision,setRevision]=useState(0);
 const [view,setView]=useState<View>('calendar'),[token,setToken]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const [authMode,setAuthMode]=useState<'login'|'create'|'forgot'|'reset'>('login'),[authOpen,setAuthOpen]=useState(false);
 const [blocked,setBlocked]=useState<{id:string;label:string}[]>([]);
 const dialog=useRef<HTMLDialogElement>(null);
 const invitationDialog=useRef<HTMLDialogElement>(null);
 const [invitationOpen,setInvitationOpen]=useState(false);
 useEffect(()=>{if(invitationOpen&&!authOpen&&authReady&&!checking&&member?.status!=='active')invitationDialog.current?.showModal();else invitationDialog.current?.close();},[invitationOpen,authOpen,authReady,checking,member]);
 useEffect(()=>{
  const search=new URLSearchParams(window.location.search);
  const hash=new URLSearchParams(window.location.hash.slice(1));
  const fragment=hash.get('invite');
  const recovery=search.get('reset-password')==='1';
  if(recovery)queueMicrotask(()=>{setAuthMode('reset');setAuthOpen(true);});
  let remembered='';try{remembered=sessionStorage.getItem(TOKEN_KEY)||'';}catch{}
  // Browser-only invitation state is read after hydration.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  if(fragment&&/^[a-f0-9]{64}$/.test(fragment)){setInvitationOpen(true);setToken(fragment);try{sessionStorage.setItem(TOKEN_KEY,fragment);}catch{}window.history.replaceState(null,'',window.location.pathname+window.location.search);}
  else if(/^[a-f0-9]{64}$/.test(remembered)){setToken(remembered);setInvitationOpen(true);}
  else if(window.location.hash==='#accept-invitation')setInvitationOpen(true);
  const client=getSupabaseBrowserClient();if(!client){setAuthReady(true);return;}
  const {data}=client.auth.onAuthStateChange((event:AuthChangeEvent,next:Session|null)=>{setSession(next);setChecking(false);setAuthReady(true);setMember(null);setPlansCount(null);if(event==='PASSWORD_RECOVERY'){setAuthMode('reset');setAuthOpen(true);}else setMessage('');});
  if(recovery)void (async()=>{
   const {data:{session:existingSession}}=await client.auth.getSession();
   if(existingSession)return;
   const code=search.get('code');
   if(code){
    const {error}=await client.auth.exchangeCodeForSession(code);
    if(!error){window.history.replaceState(null,'',`${window.location.pathname}?reset-password=1`);return;}
   }
   const token_hash=search.get('token_hash');
   if(token_hash&&search.get('type')==='recovery'){
    const {error}=await client.auth.verifyOtp({token_hash,type:'recovery'});
    if(!error){window.history.replaceState(null,'',`${window.location.pathname}?reset-password=1`);return;}
   }
   const access_token=hash.get('access_token'),refresh_token=hash.get('refresh_token');
   if(access_token&&refresh_token){
    const {error}=await client.auth.setSession({access_token,refresh_token});
    if(!error){window.history.replaceState(null,'',`${window.location.pathname}?reset-password=1`);return;}
   }
   setMessage('This password reset link is invalid or has expired. Request a new one from Member login.');
  })();
  return()=>data.subscription.unsubscribe();
 },[]);
 useEffect(()=>{if(authOpen)dialog.current?.showModal();else dialog.current?.close();},[authOpen]);
 useEffect(()=>{
  // Membership loading synchronizes a remote authenticated resource.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  if(!session)return;let active=true;setChecking(true);
  command<Member>('me').then(value=>{if(active)setMember(value);}).catch(error=>{if(active)setMessage(error.message);}).finally(()=>{if(active)setChecking(false);});
  return()=>{active=false;};
 },[session,revision]);
 useEffect(()=>{
  if(member?.status!=='active'||!session)return;
  let active=true;
  command<{id:string;label:string}[]>('blocked').then(blocks=>{if(active)setBlocked(blocks);}).catch(error=>{if(active)setMessage(error.message);});
  return()=>{active=false;};
 },[member,session]);
 async function act(fn:()=>Promise<void>){setBusy(true);setMessage('');try{await fn();}catch(error){setMessage(error instanceof Error?error.message:'Something went wrong. Please try again.');}finally{setBusy(false);}}
 function openAuth(mode:'login'|'create'|'forgot'|'reset'){setAuthMode(mode);setAuthOpen(true);setMessage('');}
 async function google(){await act(async()=>{const client=getSupabaseBrowserClient();if(!client)throw new Error('Account access is not available yet.');const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin}});if(error)throw error;});}
 function registrationData(form:FormData){return {username:String(form.get('username')||'').trim().toLowerCase(),first_name:String(form.get('firstName')||'').trim(),last_name:String(form.get('lastName')||'').trim(),date_of_birth:String(form.get('dateOfBirth')||''),gender:String(form.get('gender')||'').trim()};}
 async function authenticate(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();const form=new FormData(event.currentTarget);const email=String(form.get('email')||'').trim();const password=String(form.get('password')||'');const details=registrationData(form);
  await act(async()=>{const client=getSupabaseBrowserClient();if(!client)throw new Error('Account access is not available yet.');
   if(authMode==='create'){
    if(!token)throw new Error('Open your personal invitation to register.');
    if(password!==String(form.get('verifyPassword')||''))throw new Error('Passwords do not match.');
    const {error}=await client.auth.signUp({email,password,options:{data:details,emailRedirectTo:window.location.origin}});if(error)throw error;
    setMessage('Check your email to verify your account. Then reopen your invitation and log in to accept it.');setAuthMode('login');
   }else{const {error}=await client.auth.signInWithPassword({email,password});if(error)throw error;setAuthOpen(false);}
  });
 }
 async function requestPasswordReset(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();const form=new FormData(event.currentTarget);const email=String(form.get('email')||'').trim();
  await act(async()=>{const client=getSupabaseBrowserClient();if(!client)throw new Error('Account access is not available yet.');const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/?reset-password=1`});if(error)throw error;setMessage('Check your email for a link to set your OH-pera password.');});
 }
 async function setNewPassword(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();const form=new FormData(event.currentTarget);const password=String(form.get('password')||'');
  await act(async()=>{if(password!==String(form.get('verifyPassword')||''))throw new Error('Passwords do not match.');const client=getSupabaseBrowserClient();if(!client)throw new Error('Account access is not available yet.');const {data:{session:recoverySession}}=await client.auth.getSession();if(!recoverySession)throw new Error('This password reset link is invalid or has expired. Request a new one from Member login.');const {error}=await client.auth.updateUser({password});if(error)throw error;window.history.replaceState(null,'',window.location.pathname);setMessage('Password updated. You are signed in.');setAuthOpen(false);});
 }
 async function accept(event:React.FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);const details=registrationData(form);await act(async()=>{
  const client=getSupabaseBrowserClient();if(!client)throw new Error('Account access is not available yet.');
  const {error}=await client.auth.updateUser({data:details});if(error)throw error;
  await command('accept',{token,display_name:details.username,adult_confirmed:form.get('adult')==='on'});
  setToken('');try{sessionStorage.removeItem(TOKEN_KEY);}catch{}setRevision(n=>n+1);setMessage('Welcome to the club. Your invitation is ready whenever you are.');
 });}
 const active=member?.status==='active';
 return <div className={`club-app${!active?' club-original-landing':''}`}><a className="skip-link" href="#main-content">Skip to content</a>
  <ClubHeader><div className="club-brand"><Image className="club-demo-logo" unoptimized src="/images/oh-pera-singer-logo.png" alt="OH-pera!" width={240} height={100}/></div>
   {active&&<nav className="club-demo-nav" aria-label="Club navigation">{(['calendar','plans','invitation'] as View[]).map(item=><button key={item} aria-current={view===item?'page':undefined} onClick={()=>{setView(item);setMessage('');}}>{({calendar:'Discover',plans:`My Plans${plansCount===null?'':` (${plansCount})`}`,messages:'Messages',connections:'Connections',invitation:'Manage members',profile:'Profile'})[item]}</button>)}<button aria-current={view==='profile'?'page':undefined} onClick={()=>setView('profile')}>My profile</button><button disabled={busy} onClick={()=>act(async()=>{const {error}=await getSupabaseBrowserClient()!.auth.signOut();if(error)throw error;})}>Sign out</button></nav>}
   {!active&&<div className="club-account">{session?<>{active&&<button onClick={()=>setView('profile')}>My profile</button>}<button disabled={busy} onClick={()=>act(async()=>{const {error}=await getSupabaseBrowserClient()!.auth.signOut();if(error)throw error;})}>Sign out</button></>:<button onClick={()=>openAuth('login')}>Member login</button>}</div>}
  </ClubHeader>
  <main id="main-content" className={`club-main${!active?' club-landing-main':''}`}>
   {!authReady||checking?<p role="status">Checking your membership…</p>:!active?<>
    <section className="hero illustrated-hero club-original-hero" aria-labelledby="original-hero-heading"><Image className="club-static-hero-image" src="/images/operas/hero.jpg" alt="" fill priority sizes="100vw" unoptimized/><p className="eyebrow">New York City · An invitation-only opera club</p><h1 id="original-hero-heading">An opera for<br/><em>your evening.</em></h1><p className="intro">Join through a friend. Find an opera, see who’s going, and make plans with your circle.</p><div className="club-hero-entry-actions"><button className="club-register-link" onClick={()=>{setMessage('');setInvitationOpen(true);}}>Register with an invitation</button></div></section>
    <ClubIntroduction/>
    <dialog ref={invitationDialog} className="club-auth club-invitation-dialog" aria-labelledby="invitation-dialog-title" onCancel={()=>setInvitationOpen(false)}><button className="club-auth-close" aria-label="Close invitation window" onClick={()=>setInvitationOpen(false)}>×</button><h2 id="invitation-dialog-title">Register with an invitation</h2>
    <section className="club-entry" id="accept-invitation"><p className="club-kicker">Your place in the circle</p>
     {member?.status==='left'||member?.status==='suspended'?<><h2>Membership {member.status==='left'?'inactive':'paused'}</h2><p>Please contact Ivaylo or Anastasiya about your membership. Your original invitation history is preserved.</p></>:token?<><h2>Continue with your invitation.</h2><p>Use the email address your friend invited. Only that verified account can accept this invitation.</p>{!session?<div className="club-actions"><button className="club-primary" onClick={()=>openAuth('create')}>Create account</button><button onClick={()=>openAuth('login')}>I already have an account</button></div>:<form onSubmit={accept}><label>Username<input name="username" maxLength={30} required autoComplete="username" pattern="[a-z0-9_]{3,30}" title="Use 3 to 30 lowercase letters, numbers, or underscores."/></label><label>First name<input name="firstName" maxLength={80} required autoComplete="given-name"/></label><label>Last name<input name="lastName" maxLength={80} required autoComplete="family-name"/></label><label>Date of birth<input name="dateOfBirth" type="date" required autoComplete="bday"/></label><label>Gender <span>(optional)</span><input name="gender" maxLength={50} autoComplete="sex"/></label><label className="club-check"><input type="checkbox" name="adult" required/>I confirm I am 18 or older.</label><p>Your username and About You section can be visible to members within two invitation steps. Your legal name and date of birth remain private.</p><button className="club-primary" disabled={busy}>Accept invitation</button></form>}</>:<><h2>Good company begins with an invitation.</h2><p>Open the personal invitation link your friend shared to get started. If you haven’t received one yet, ask a member you know.</p><details className="club-invitation-fallback"><summary>Already have a link? Paste it here</summary><form onSubmit={event=>{event.preventDefault();const value=String(new FormData(event.currentTarget).get('inviteLink')||'');try{const url=new URL(value);const next=new URLSearchParams(url.hash.slice(1)).get('invite')||'';if(url.origin!==window.location.origin||!/^[a-f0-9]{64}$/.test(next))throw Error();setToken(next);try{sessionStorage.setItem(TOKEN_KEY,next);}catch{}setMessage('');}catch{setMessage('Enter a complete invitation link for this website.');}}}><label>Personal invitation link<input name="inviteLink" type="url" required placeholder="Paste the link your friend shared"/></label><button type="submit">Open invitation</button></form></details>{session&&<p>Your existing account and saved performances are kept. Club access requires an invitation.</p>}</>}
    </section>{message&&<p role="status">{message}</p>}</dialog>
   </>:<>
    <ClubMemberPages api={command} view={view==='invitation'?'members':view==='connections'?'calendar':view} onView={setView} onPlansCount={setPlansCount} onProfileSaved={()=>setRevision(n=>n+1)}/>
    {view==='profile'&&blocked.length>0&&<section className="club-panel"><h2>Blocked connections</h2>{blocked.map(person=><p key={person.id}>{person.label} <button onClick={()=>act(async()=>{await command('unblock',{id:person.id});setRevision(n=>n+1);})}>Unblock</button></p>)}</section>}
   </>}
   {message&&!invitationOpen&&!authOpen&&<p className="club-notice" role="status">{message}</p>}
  </main>
  <footer className="club-footer"><span>OH-pera · An evening, a connection.</span><Link href="/privacy">Privacy &amp; membership</Link></footer>
  <dialog ref={dialog} className="club-auth" aria-labelledby="club-auth-title" onCancel={()=>setAuthOpen(false)}>
   <button className="club-auth-close" onClick={()=>setAuthOpen(false)} aria-label="Close account window">×</button>
   <h2 id="club-auth-title">{!supabaseConfigured()?'A preview of your club.':authMode==='create'?'Your invitation starts here.':authMode==='forgot'?'Reset your password.':authMode==='reset'?'Choose a new password.':'Welcome back.'}</h2>
   {!supabaseConfigured()?<><p>Membership is not open in this preview. Account registration and login will be available once the club is connected.</p><p>You can explore the invitation process now. No account details are collected here.</p><button className="club-primary" onClick={()=>setAuthOpen(false)}>Back to the club</button></>:authMode==='forgot'?<><p>Enter the email address you used to register. We’ll send a link to choose a password.</p><form onSubmit={requestPasswordReset}><label>Email<input name="email" type="email" required autoComplete="email"/></label><button className="club-primary" disabled={busy}>{busy?'Please wait…':'Send reset link'}</button></form><button className="club-text" onClick={()=>setAuthMode('login')}>Back to member login</button></>:authMode==='reset'?<><p>Choose a new password for your OH-pera account.</p><form onSubmit={setNewPassword}><label>New password<input name="password" type="password" required minLength={8} autoComplete="new-password"/></label><label>Verify password<input name="verifyPassword" type="password" required minLength={8} autoComplete="new-password"/></label><button className="club-primary" disabled={busy}>{busy?'Please wait…':'Set new password'}</button></form></>:<><p>{authMode==='create'?'Join your friend’s opera circle: create an account with the invited email, verify it, then accept your invitation.':'Log in with your registered email and password, or the Google account you used to register.'}</p><form onSubmit={authenticate}>{authMode==='create'&&<><label>Username<input name="username" maxLength={30} required autoComplete="username" pattern="[a-z0-9_]{3,30}"/></label><label>First name<input name="firstName" maxLength={80} required autoComplete="given-name"/></label><label>Last name<input name="lastName" maxLength={80} required autoComplete="family-name"/></label><label>Date of birth<input name="dateOfBirth" type="date" required autoComplete="bday"/></label><label>Gender <span>(optional)</span><input name="gender" maxLength={50} autoComplete="sex"/></label></>}<label>Email<input name="email" type="email" required autoComplete="email"/></label><label>Password<input name="password" type="password" required minLength={8} autoComplete={authMode==='create'?'new-password':'current-password'}/></label>{authMode==='create'&&<label>Verify password<input name="verifyPassword" type="password" required minLength={8} autoComplete="new-password"/></label>}<button className="club-primary" disabled={busy||!supabaseConfigured()}>{busy?'Please wait…':authMode==='create'?'Create account':'Log in'}</button></form>{authMode==='login'&&<><div className="auth-divider"><span>or</span></div><button type="button" className="google-login" onClick={google} disabled={busy}>Continue with Google</button><button className="club-text" onClick={()=>setAuthMode('forgot')}>Forgot password?</button></>}{token&&<button className="club-text" onClick={()=>setAuthMode(authMode==='login'?'create':'login')}>{authMode==='login'?'Create an invited account':'Already registered? Log in'}</button>}</>}
   {message&&<p role="status">{message}</p>}
  </dialog>
 </div>;
}
