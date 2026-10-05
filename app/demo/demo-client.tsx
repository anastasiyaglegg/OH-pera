'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ClubHeader from '../club/club-header';
import ClubMemberPages,{type MemberView} from '../club/club-member-pages';
import ClubMessageLauncher from '../club/club-message-launcher';
import {createDemoApi} from '../../lib/demo-api';

export default function DemoClient(){
 const [generation,setGeneration]=useState(0);
 return <DemoSession key={generation} onReset={()=>setGeneration(value=>value+1)}/>;
}
function DemoSession({onReset}:{onReset:()=>void}){
 const api=useMemo(()=>createDemoApi(),[]);
 const [stage,setStage]=useState<'invite'|'register'|'confirm'|'club'>('club');
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(stage!=='club')dialog.current?.showModal();else dialog.current?.close();},[stage]);
 const [view,setView]=useState<MemberView>('calendar');
 const [word,setWord]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [revision,setRevision]=useState(0);
 const [,setPlansCount]=useState<number|null>(null);
 async function acceptGuest(){
  try{const state=await api<{history:{id:string;status:string}[]}>('invitation_state');const pending=state.history.find(i=>i.status==='pending');if(!pending){setNotice('Create a demo invitation below first, then simulate its acceptance.');return;}await api('demo_accept',{id:pending.id});setRevision(value=>value+1);setNotice('Your fictional guest joined. Find them in your invitees and the friends’ circle.');}catch{setNotice('Could not accept the demo invitation. Please try again.');}
 }
 return <div className="club-app club-public-demo"><a className="skip-link" href="#main-content">Skip to content</a><ClubHeader><div className="club-brand"><Link href="/" aria-label="OH-pera home"><Image className="club-demo-logo" src="/images/oh-pera-singer-logo.png" alt="OH-pera!" width={240} height={100} unoptimized/></Link></div><ClubMessageLauncher api={api}/><nav className="club-demo-nav" aria-label="Club navigation"><button aria-current={view==='calendar'?'page':undefined} onClick={()=>setView('calendar')}>Discover</button><details className="club-account-menu"><summary>My Account <span aria-hidden="true">⌄</span></summary><div className="club-account-menu-options"><button aria-current={view==='profile'?'page':undefined} onClick={()=>setView('profile')}>My profile</button><button aria-current={view==='members'?'page':undefined} onClick={()=>setView('members')}>Invite members</button></div></details><Link className="club-return-link" href="/">Exit demo</Link></nav></ClubHeader>
 <main id="main-content" className="club-main"><aside className="club-demo-status" aria-label="Demo information"><p><strong>Demo</strong> · You’re Maya. All members and activity are fictional.</p><details className="club-demo-help"><summary>How to try it</summary><div><p>Choose “I’m going,” open your friends’ circle, and select someone to view their profile or chat. Replies are automatic. No emails are sent, and changes reset when you refresh.</p><div className="club-actions"><button onClick={()=>setStage('invite')}>Preview registration</button><button onClick={onReset}>Restart demo</button></div></div></details></aside>
 <ClubMemberPages key={revision} api={api} view={view} onView={setView} onPlansCount={setPlansCount} demo/>
 {view==='members'&&<aside className="club-demo-invite-help"><p className="club-fine-print">Use a fictional email above, then try accepting that invitation.</p><button onClick={()=>void acceptGuest()}>Simulate guest accepting invitation</button>{notice&&<p role="status">{notice}</p>}</aside>}
 </main><footer className="club-footer"><span>OH-pera · An evening, a connection.</span><Link href="/privacy">Privacy &amp; membership</Link></footer>
 <dialog ref={dialog} className="club-auth club-invitation-dialog" aria-labelledby="demo-title" onCancel={()=>setStage('club')}><button className="club-auth-close" aria-label="Close demo registration" onClick={()=>setStage('club')}>×</button>
 {stage==='invite'?<><h2 id="demo-title">Your invitation starts here.</h2><p>Sofia invited Maya to OH-pera. This is a preview of the email a new member receives.</p><label>Invited email<input value="maya@example.com" readOnly type="email"/></label><label>Secret word<input value="overture" readOnly/></label><div className="club-actions"><button className="club-primary" onClick={()=>setStage('register')}>Continue with invitation</button></div><p className="club-fine-print">Demo only. No real email or account required.</p></>:stage==='register'?<><h2 id="demo-title">Register with an invitation</h2><p>Enter the demo secret word to continue as Maya.</p><form onSubmit={event=>{event.preventDefault();if(word.trim().toLowerCase()!=='overture'){setError('Use the secret word from the demo email: overture.');return;}setError('');setStage('confirm');}}><label>Email<input value="maya@example.com" readOnly type="email"/></label><label>Secret word<input value={word} onChange={event=>setWord(event.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="overture" required/></label>{error&&<p role="alert">{error}</p>}<button className="club-primary">Continue</button></form><p className="club-fine-print">Registration preview. Your real account stays unchanged.</p></>:stage==='confirm'?<><h2 id="demo-title">Your place in the circle.</h2><p>In the real club, you verify your email and accept your invitation. Try that step here with Maya’s fictional account.</p><button className="club-primary" onClick={()=>setStage('club')}>Confirm demo email and join</button></>:null}
 </dialog></div>;
}
