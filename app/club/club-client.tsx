'use client';
import ClubHeader from './club-header';
import Link from 'next/link';
import ClubInvitations from './club-invitations';
import ClubActivity from './club-activity';
import {useAccountSaves} from '../use-account-saves';
import Image from 'next/image';
import {useEffect,useRef,useState} from 'react';
import type {AuthChangeEvent,Session} from '@supabase/supabase-js';
import {getSupabaseBrowserClient,supabaseConfigured} from '../../lib/supabase/client';

type Member={id?:string;status:'active'|'left'|'suspended'|'not_member';display_name?:string;bio?:string};
type Connection={id:string;display_name:string;bio:string;distance:number};
type Invitation={id:string;email:string;expires_at:string;status:string;member:{id:string;display_name:string}|null};
type InvitationState={available:boolean;history:Invitation[]};
type AccountProfile={username:string|null;first_name:string|null;last_name:string|null;date_of_birth:string|null;gender:string|null;about_you:string;interests:string[];portrait_path:string|null};
type View='calendar'|'plans'|'messages'|'connections'|'invitation'|'profile';
const TOKEN_KEY='ohpera-club-invitation';
const INTERESTS=['Dinner before the Opera','Drinks together','Opera Discussion','Open to Dating','Champagne and Chit-Chat'];
async function command<T>(operation:string,payload:Record<string,unknown>={}):Promise<T>{
 const client=getSupabaseBrowserClient();if(!client)throw new Error('Account access is not available yet. Please try again later.');
 const {data,error}=await client.rpc('club_command',{operation,payload});
 if(error)throw new Error(error.code==='P0001'?error.message:'Club access could not be verified. Please try again.');
 return data as T;
}

export default function ClubClient(){
 const [plansCount,setPlansCount]=useState<number|null>(null);
 const [session,setSession]=useState<Session|null>(null),[authReady,setAuthReady]=useState(false);
 const [member,setMember]=useState<Member|null>(null),[checking,setChecking]=useState(false),[revision,setRevision]=useState(0);
 const [view,setView]=useState<View>('calendar'),[token,setToken]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const [authMode,setAuthMode]=useState<'login'|'create'>('login'),[authOpen,setAuthOpen]=useState(false);
 const [connections,setConnections]=useState<Connection[]>([]),[invitations,setInvitations]=useState<InvitationState|null>(null),[profile,setProfile]=useState<AccountProfile|null>(null),[portraitUrl,setPortraitUrl]=useState<string|null>(null);
 const [blocked,setBlocked]=useState<{id:string;label:string}[]>([]),[dismissedInvite,setDismissedInvite]=useState(false);
 const {savedRecords,toggleSave}=useAccountSaves();
 const dialog=useRef<HTMLDialogElement>(null);
 const invitationDialog=useRef<HTMLDialogElement>(null);
 const [invitationOpen,setInvitationOpen]=useState(false);
 useEffect(()=>{if(invitationOpen&&!authOpen&&authReady&&!checking&&member?.status!=='active')invitationDialog.current?.showModal();else invitationDialog.current?.close();},[invitationOpen,authOpen,authReady,checking,member]);
 useEffect(()=>{
  const fragment=new URLSearchParams(window.location.hash.slice(1)).get('invite');
  let remembered='';try{remembered=sessionStorage.getItem(TOKEN_KEY)||'';}catch{}
  // Browser-only invitation state is read after hydration.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  if(fragment&&/^[a-f0-9]{64}$/.test(fragment)){setInvitationOpen(true);setToken(fragment);try{sessionStorage.setItem(TOKEN_KEY,fragment);}catch{}window.history.replaceState(null,'',window.location.pathname+window.location.search);}
  else if(/^[a-f0-9]{64}$/.test(remembered)){setToken(remembered);setInvitationOpen(true);}
  else if(window.location.hash==='#accept-invitation')setInvitationOpen(true);
  const client=getSupabaseBrowserClient();if(!client){setAuthReady(true);return;}
  const {data}=client.auth.onAuthStateChange((_event:AuthChangeEvent,next:Session|null)=>{setSession(next);setChecking(false);setAuthReady(true);setMember(null);setPlansCount(null);setConnections([]);setInvitations(null);setProfile(null);setPortraitUrl(null);setMessage('');});
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
  Promise.all([command<Connection[]>('connections'),command<InvitationState>('invitation_list'),command<{id:string;label:string}[]>('blocked')]).then(([people,invites,blocks])=>{if(active){setConnections(people);setInvitations(invites);setBlocked(blocks);}}).catch(error=>{if(active)setMessage(error.message);});
  return()=>{active=false;};
 },[member,session]);
 useEffect(()=>{
  if(member?.status!=='active'||!session)return;let active=true;
  command<AccountProfile>('account_profile',{action:'get'}).then(value=>{if(active)setProfile(value);}).catch(error=>{if(active)setMessage(error.message);});
  return()=>{active=false;};
 },[member,session,revision]);
 useEffect(()=>{
  if(!session||!profile?.portrait_path)return;let active=true;
  getSupabaseBrowserClient()?.storage.from('club-portraits').createSignedUrl(profile.portrait_path,3600).then(({data})=>{if(active)setPortraitUrl(data?.signedUrl||null);});
  return()=>{active=false;};
 },[profile?.portrait_path,session]);
 async function act(fn:()=>Promise<void>){setBusy(true);setMessage('');try{await fn();}catch(error){setMessage(error instanceof Error?error.message:'Something went wrong. Please try again.');}finally{setBusy(false);}}
 function openAuth(mode:'login'|'create'){setAuthMode(mode);setAuthOpen(true);setMessage('');}
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
 async function accept(event:React.FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);const details=registrationData(form);await act(async()=>{
  const client=getSupabaseBrowserClient();if(!client)throw new Error('Account access is not available yet.');
  const {error}=await client.auth.updateUser({data:details});if(error)throw error;
  await command('accept',{token,display_name:details.username,adult_confirmed:form.get('adult')==='on'});
  setToken('');try{sessionStorage.removeItem(TOKEN_KEY);}catch{}setRevision(n=>n+1);setMessage('Welcome to the club. Your invitation is ready whenever you are.');
 });}
 async function saveProfile(event:React.FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);const details=registrationData(form);await act(async()=>{
  const client=getSupabaseBrowserClient();if(!client||!session)throw new Error('Account access is not available yet.');
  const file=form.get('portrait');let portraitPath=profile?.portrait_path||null;
  if(file instanceof File&&file.size){
   if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5_000_000)throw new Error('Choose a JPG, PNG, or WebP portrait smaller than 5 MB.');
   const extension=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';portraitPath=`${session.user.id}/portrait.${extension}`;
   const {error}=await client.storage.from('club-portraits').upload(portraitPath,file,{upsert:true,contentType:file.type});if(error)throw error;
  }
  const updated=await command<AccountProfile>('account_profile',{action:'update',...details,about_you:String(form.get('aboutYou')||''),interests:form.getAll('interests'),portrait_path:portraitPath});
  setProfile(updated);setRevision(n=>n+1);setMessage('Profile updated.');
 });}
 const active=member?.status==='active';
 return <div className={`club-app${!active?' club-original-landing':''}`}><a className="skip-link" href="#main-content">Skip to content</a>
  <ClubHeader><Link className={active?"club-brand":"wordmark singer-wordmark"} href="/" aria-label="OH-pera home"><Image unoptimized src="/images/oh-pera-singer-logo.png" alt="OH-pera!" width={240} height={100}/></Link>
   {active&&<nav aria-label="Club navigation">{(['calendar','plans','connections','invitation'] as View[]).map(item=><button key={item} aria-current={view===item?'page':undefined} onClick={()=>{setView(item);setMessage('');}}>{({calendar:'Calendar',plans:`My Plans${plansCount===null?'':` (${plansCount})`}`,messages:'Messages',connections:'Connections',invitation:'Manage members',profile:'Profile'})[item]}</button>)}</nav>}
   <div className="club-account">{session?<>{active&&<button onClick={()=>setView('profile')}>My profile</button>}<button disabled={busy} onClick={()=>act(async()=>{const {error}=await getSupabaseBrowserClient()!.auth.signOut();if(error)throw error;})}>Sign out</button></>:<button onClick={()=>openAuth('login')}>Member login</button>}</div>
  </ClubHeader>
  <main id="main-content" className={`club-main${!active?' club-landing-main':''}`}>
   {!authReady||checking?<p role="status">Checking your membership…</p>:!active?<>
    <section className="hero illustrated-hero club-original-hero" aria-labelledby="original-hero-heading"><Image className="club-static-hero-image" src="/images/operas/hero.jpg" alt="" fill priority sizes="100vw" unoptimized/><p className="eyebrow">New York City · Find your next evening</p><h1 id="original-hero-heading">An opera for<br/><em>your evening.</em></h1><p className="intro">Explore the operas, choose a date, and make a night of it—with people you know.</p><div className="club-hero-entry-actions"><button className="club-register-link" onClick={()=>{setMessage('');setInvitationOpen(true);}}>Register with an invitation</button></div></section>
    <section id="club-introduction" className="club-original-introduction"><div className="section-head"><h2>Good company. Great opera.</h2></div><p className="club-original-lead">A private club, one personal invitation at a time. See who in your circle is attending, and arrange where to meet through a private conversation. Inviting a friend is optional.</p></section>
    <dialog ref={invitationDialog} className="club-auth club-invitation-dialog" aria-labelledby="invitation-dialog-title" onCancel={()=>setInvitationOpen(false)}><button className="club-auth-close" aria-label="Close invitation window" onClick={()=>setInvitationOpen(false)}>×</button><h2 id="invitation-dialog-title">Register with an invitation</h2>
    <section className="club-entry" id="accept-invitation"><p className="club-kicker">Your place in the circle</p>
     {member?.status==='left'||member?.status==='suspended'?<><h2>Membership {member.status==='left'?'inactive':'paused'}</h2><p>Please contact Ivaylo or Anastasiya about your membership. Your original invitation history is preserved.</p></>:token?<><h2>Continue with your invitation.</h2><p>Use the email address your friend invited. Only that verified account can accept this invitation.</p>{!session?<div className="club-actions"><button className="club-primary" onClick={()=>openAuth('create')}>Create account</button><button onClick={()=>openAuth('login')}>I already have an account</button></div>:<form onSubmit={accept}><label>Username<input name="username" maxLength={30} required autoComplete="username" pattern="[a-z0-9_]{3,30}" title="Use 3 to 30 lowercase letters, numbers, or underscores."/></label><label>First name<input name="firstName" maxLength={80} required autoComplete="given-name"/></label><label>Last name<input name="lastName" maxLength={80} required autoComplete="family-name"/></label><label>Date of birth<input name="dateOfBirth" type="date" required autoComplete="bday"/></label><label>Gender <span>(optional)</span><input name="gender" maxLength={50} autoComplete="sex"/></label><label className="club-check"><input type="checkbox" name="adult" required/>I confirm I am 18 or older.</label><p>Your username and About You section can be visible to members within two invitation steps. Your legal name and date of birth remain private.</p><button className="club-primary" disabled={busy}>Accept invitation</button></form>}</>:<><h2>Good company begins with an invitation.</h2><p>Open the personal invitation link your friend shared to get started. If you haven’t received one yet, ask a member you know.</p><details className="club-invitation-fallback"><summary>Already have a link? Paste it here</summary><form onSubmit={event=>{event.preventDefault();const value=String(new FormData(event.currentTarget).get('inviteLink')||'');try{const url=new URL(value);const next=new URLSearchParams(url.hash.slice(1)).get('invite')||'';if(url.origin!==window.location.origin||!/^[a-f0-9]{64}$/.test(next))throw Error();setToken(next);try{sessionStorage.setItem(TOKEN_KEY,next);}catch{}setMessage('');}catch{setMessage('Enter a complete invitation link for this website.');}}}><label>Personal invitation link<input name="inviteLink" type="url" required placeholder="Paste the link your friend shared"/></label><button type="submit">Open invitation</button></form></details>{session&&<p>Your existing account and saved performances are kept. Club access requires an invitation.</p>}</>}
    </section>{message&&<p role="status">{message}</p>}</dialog>
   </>:<>
    {view!=='calendar'&&view!=='plans'&&<section className="club-page-heading"><p className="club-kicker">Your private opera circle</p><h1>{({calendar:'An evening in good company.',plans:'Your shared evenings.',messages:'Make a plan together.',connections:'People in your circle.',invitation:'Manage members',profile:'Your member profile.'})[view]}</h1><p>{view==='connections'?'Your connections extend two invitation steps in either direction.':view==='invitation'?'One invitation can be the beginning of many shared evenings.':view==='profile'?'Choose how you introduce yourself to your connections.':'Explore upcoming performances across New York.'}</p></section>}
    {view==='calendar'&&invitations?.available&&!dismissedInvite&&<aside className="club-invite-banner"><div><strong>Opera is better with someone you know.</strong><p>You have one invitation. Use it whenever you’re ready.</p></div><button onClick={()=>setView('invitation')}>Invite a friend</button><button className="club-text" onClick={()=>setDismissedInvite(true)}>Maybe later</button></aside>}
    {(view==='calendar'||view==='plans'||view==='messages')&&<ClubActivity api={command} view={view} onView={setView} onPlansCount={setPlansCount}/>}
    {view==='plans'&&<details className="club-panel"><summary>Previously saved performances</summary><p>Saving an opera does not mark you as attending. Choose “I’m going” in the calendar to add it to your plans.</p>{Object.values(savedRecords).map(p=><p key={p.id}>{p.title} · {p.date} <button onClick={()=>toggleSave(p)}>Remove saved performance</button></p>)}</details>}
    {view==='connections'&&<><div className="club-people">{connections.map(person=><article key={person.id}><div className="club-avatar" aria-hidden="true">{person.display_name.charAt(0)}</div><p className="club-kicker">{person.distance===1?'One invitation step':'Two invitation steps'}</p><h2>{person.display_name}</h2><p>{person.bio||'Part of your opera circle.'}</p><button onClick={()=>{if(window.confirm(`Block ${person.display_name}? Your profiles will be hidden from each other.`))void act(async()=>{await command('block',{id:person.id});setRevision(n=>n+1);});}}>Block connection</button></article>)}</div>{connections.length===0&&<p>Your circle will appear here as your connections join. You don’t have to invite anyone to remain a member.</p>}</>}
    {view==='invitation'&&<section className="club-members-page"><ClubInvitations api={command}/></section>}
    {view==='profile'&&<section className="club-panel"><form key={revision} onSubmit={saveProfile}><label>Portrait <span>(optional, JPG, PNG, or WebP, up to 5 MB)</span><input name="portrait" type="file" accept="image/jpeg,image/png,image/webp"/>{portraitUrl&&<Image src={portraitUrl} alt="Your current portrait" width={96} height={96} unoptimized/>}</label><label>Username<input name="username" defaultValue={profile?.username||member.display_name} maxLength={30} required autoComplete="username" pattern="[a-z0-9_]{3,30}"/></label><label>First name<input name="firstName" defaultValue={profile?.first_name||''} maxLength={80} required autoComplete="given-name"/></label><label>Last name<input name="lastName" defaultValue={profile?.last_name||''} maxLength={80} required autoComplete="family-name"/></label><label>Date of birth<input name="dateOfBirth" type="date" defaultValue={profile?.date_of_birth||''} required autoComplete="bday"/></label><label>Email<input value={session?.user.email||''} readOnly aria-readonly="true"/></label><label>Gender <span>(optional)</span><input name="gender" defaultValue={profile?.gender||''} maxLength={50} autoComplete="sex"/></label><label>About you <span>(300 characters max)</span><textarea name="aboutYou" defaultValue={profile?.about_you||''} maxLength={300} rows={4}/></label><fieldset><legend>Interests</legend>{INTERESTS.map(interest=><label className="club-check" key={interest}><input name="interests" type="checkbox" value={interest} defaultChecked={profile?.interests?.includes(interest)}/> {interest}</label>)}</fieldset><button className="club-primary" disabled={busy}>Save profile</button></form><h2>Blocked connections</h2>{blocked.length===0?<p>No blocked connections.</p>:blocked.map(person=><p key={person.id}>{person.label} <button onClick={()=>act(async()=>{await command('unblock',{id:person.id});setRevision(n=>n+1);})}>Unblock</button></p>)}</section>}
   </>}
   {message&&!invitationOpen&&!authOpen&&<p className="club-notice" role="status">{message}</p>}
  </main>
  <footer className="club-footer"><span>OH-pera · An evening, a connection.</span><Link href="/privacy">Privacy &amp; membership</Link></footer>
  <dialog ref={dialog} className="club-auth" aria-labelledby="club-auth-title" onCancel={()=>setAuthOpen(false)}><button className="club-auth-close" onClick={()=>setAuthOpen(false)} aria-label="Close account window">×</button><h2 id="club-auth-title">{!supabaseConfigured()?'A preview of your club.':authMode==='create'?'Your invitation starts here.':'Welcome back.'}</h2>{!supabaseConfigured()?<><p>Membership is not open in this preview. Account registration and login will be available once the club is connected.</p><p>You can explore the invitation process now. No account details are collected here.</p><button className="club-primary" onClick={()=>setAuthOpen(false)}>Back to the club</button></>:<><p>{authMode==='create'?'Create your account, verify your email, then accept your invitation.':'Log in with your account email or Google.'}</p><form onSubmit={authenticate}>{authMode==='create'&&<><label>Username<input name="username" maxLength={30} required autoComplete="username" pattern="[a-z0-9_]{3,30}"/></label><label>First name<input name="firstName" maxLength={80} required autoComplete="given-name"/></label><label>Last name<input name="lastName" maxLength={80} required autoComplete="family-name"/></label><label>Date of birth<input name="dateOfBirth" type="date" required autoComplete="bday"/></label><label>Gender <span>(optional)</span><input name="gender" maxLength={50} autoComplete="sex"/></label></>}<label>Email<input name="email" type="email" required autoComplete="email"/></label><label>Password<input name="password" type="password" required minLength={8} autoComplete={authMode==='create'?'new-password':'current-password'}/></label>{authMode==='create'&&<label>Verify password<input name="verifyPassword" type="password" required minLength={8} autoComplete="new-password"/></label>}<button className="club-primary" disabled={busy||!supabaseConfigured()}>{busy?'Please wait…':authMode==='create'?'Create account':'Log in'}</button></form><div className="auth-divider"><span>or</span></div><button type="button" className="google-login" onClick={google} disabled={busy}>Continue with Google</button>{message&&<p role="status">{message}</p>}{token&&<button className="club-text" onClick={()=>setAuthMode(authMode==='login'?'create':'login')}>{authMode==='login'?'Create an invited account':'Already registered? Log in'}</button>}</>}</dialog>
 </div>;
}
