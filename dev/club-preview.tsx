import ClubIntroduction from '../app/club/club-introduction';
import ClubMemberPages from '../app/club/club-member-pages';
import ClubHeader from '../app/club/club-header';
/* eslint-disable @next/next/no-img-element -- Standalone local demo shares the original static brand artwork. */
import React,{useEffect,useMemo,useState,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {type ActivityView,type ClubApi} from '../app/club/club-activity';
function TesterLanding({onEnter}:{onEnter:()=>void}){
 const [panel,setPanel]=useState<'login'|'invite'|null>(null);
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(panel)dialog.current?.showModal();else dialog.current?.close();},[panel]);
 return <div className="club-app club-original-landing"><ClubHeader><img className="club-demo-logo" src="/images/oh-pera-singer-logo.png" width="260" height="100" alt="OH-pera!"/><div className="club-account"><button onClick={()=>setPanel('login')}>Member login</button></div></ClubHeader>
 <main className="club-main club-landing-main"><section className="hero illustrated-hero club-original-hero" aria-labelledby="tester-hero-heading"><img className="club-static-hero-image" src="/images/operas/hero.jpg" alt=""/><p className="eyebrow">New York City · An invitation-only opera club</p><h1 id="tester-hero-heading">An opera for<br/><em>your evening.</em></h1><p className="intro">Join through a friend. Find an opera, see who’s going, and make plans with your circle.</p><div className="club-hero-entry-actions"><button className="club-register-link" onClick={()=>setPanel('invite')}>Register with an invitation</button></div></section><ClubIntroduction/></main>
 <dialog ref={dialog} className="club-auth" aria-labelledby="tester-account-title" onCancel={()=>setPanel(null)}><button className="club-auth-close" aria-label="Close account window" onClick={()=>setPanel(null)}>×</button><h2 id="tester-account-title">{panel==='invite'?'Try the club first.':'Welcome back.'}</h2><p>{panel==='invite'?'Real registration requires a personal invitation and the connected account service. For now, explore with our fictional tester account.':'Continue as Maya, our fictional tester member. No email or password is needed.'}</p><button className="club-primary" onClick={onEnter}>Continue as Maya — tester account</button><p className="club-fine-print">Local preview only. Plans and conversations reset when the preview server restarts.</p></dialog></div>;
}
function Preview(){
 const [signedOut,setSignedOut]=useState(()=>{try{return sessionStorage.getItem('ohpera-demo-session')!=='active';}catch{return true;}});
 function signOut(){try{sessionStorage.removeItem('ohpera-demo-session');}catch{}setSignedOut(true);setPlansCount(null);setView('calendar');}
 function resumePreview(){try{sessionStorage.setItem('ohpera-demo-session','active');}catch{}setMember(2);setView('calendar');setSignedOut(false);}

 const [plansCount,setPlansCount]=useState<number|null>(null);
 const [sources,setSources]=useState<{id:string;name:string;url:string}[]>([]);
 useEffect(()=>{fetch('/coverage.json').then(r=>r.json()).then(data=>{if(data&&typeof data==='object'&&'sources' in data&&Array.isArray(data.sources))setSources(data.sources);}).catch(()=>{});},[]);
 const [member,setMember]=useState(2),[view,setView]=useState<ActivityView|'members'|'profile'>('calendar');
 const api=useMemo<ClubApi>(()=>async<T,>(operation:string,payload:Record<string,unknown>={})=>{
  const response=await fetch('/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({member,operation,payload})});
  const data:unknown=await response.json();if(!response.ok)throw new Error((data as {error?:string}).error||'Preview request failed.');return data as T;
 },[member]);
 if(signedOut)return <TesterLanding onEnter={resumePreview}/>;
 return <div className="club-app"><ClubHeader><img src="/images/oh-pera-singer-logo.png" className="club-demo-logo" width="260" height="100" alt="OH-pera!"/><nav className="club-demo-nav" aria-label="Club navigation">{(['calendar','plans'] as ActivityView[]).map(item=><button key={item} aria-current={view===item?'page':undefined} onClick={()=>setView(item)}>{({calendar:'Discover',plans:`My Plans${plansCount===null?'':` (${plansCount})`}`,messages:'Messages'})[item]}</button>)}<button aria-current={view==='members'?'page':undefined} onClick={()=>setView('members')}>Manage members</button><button aria-current={view==='profile'?'page':undefined} onClick={()=>setView('profile')}>My profile</button><button onClick={signOut}>Sign out</button></nav></ClubHeader><main className="club-main"><ClubMemberPages key={member} api={api} view={view} onView={setView} onPlansCount={setPlansCount} demo/>{view==='calendar'&&<><p className="club-schedule-note">Browse all available listings in our NYC feed. Citywide coverage is incomplete; confirm dates and availability with the presenter. Attendance and messages in this preview are fictional.</p><details className="club-demo-help"><summary>Opera companies &amp; schedule coverage</summary><p>Some organizations publish announcements before individual dates. Check their official schedules for additional performances.</p><ul>{sources.map(source=><li key={source.id}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.name}</a></li>)}</ul></details><details className="club-demo-help"><summary>About this local demo</summary><p>Sofia → Maya → Ahmet → Lina → Noah. Elena belongs to a separate chain. This preview uses Maya’s fictional account to explore visibility and private messages. Demo data resets when the server restarts.</p></details></>}</main></div>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
