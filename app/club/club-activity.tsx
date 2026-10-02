'use client';
/* eslint-disable @next/next/no-img-element -- Shared local/production UI uses existing static artwork with explicit dimensions. */
import {useCallback,useEffect,useRef,useState,type ReactNode,type CSSProperties} from 'react';
import {meetingInterests,type ClubProfileData} from './club-profile';
import ClubFilterSelect from './club-filter-select';
import {operaIntroduction} from '../../lib/opera-content';
export type ActivityView='calendar'|'plans'|'messages';
export type ClubApi=<T>(operation:string,payload?:Record<string,unknown>)=>Promise<T>;
type Person={id:string;display_name:string;relationship?:string};
type EventRow={performance:{id:string;title:string;composer?:string;company:string;venue:string;date:string;time?:string;status?:string;kind?:string;verification?:string;checkedAt?:string;ticketUrl?:string;description?:string|null;neighborhood?:string;borough?:string;runtime?:string;language?:string;sourceUrl?:string};revision:number;mine:null|'going'|'reconfirm'|'cancelled';total:number;people:Person[]};
type Contact=Person&{can_message:boolean;unread:number};
type Message={id:string;mine:boolean;body:string;created_at:string};
type Thread={messages:Message[];can_message:boolean};
function combineThread(previous:Thread|null,next:Thread):Thread{
 const messages=new Map((previous?.messages||[]).map(message=>[message.id,message]));
 for(const message of next.messages)messages.set(message.id,message);
 return {...next,messages:[...messages.values()].sort((a,b)=>BigInt(a.id)<BigInt(b.id)?-1:1)};
}
function messageText(body:string){return body.split(/(https?:\/\/[^\s]+)/g).map((part,index)=>/^https?:\/\//.test(part)?<a key={index} href={part} target="_blank" rel="noopener noreferrer">{part}</a>:part);}
const artwork:Record<string,string>={'macbeth':'macbeth','la boheme':'la-boheme','cosi fan tutte':'cosi-fan-tutte','otello':'otello','manon':'manon','medea':'medea','parsifal':'parsifal','samson et dalila':'samson-et-dalila','la fanciulla del west':'la-fanciulla-del-west','silent night':'silent-night','lincoln in the bardo':'lincoln-in-the-bardo'};
function artFor(title:string){return artwork[title.split(' (')[0].normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()];}
const dateLabel=(value:string)=>new Date(`${value}T12:00:00`).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
const timeLabel=(value?:string)=>value?new Date(`2000-01-01T${value}`).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):'Time to be confirmed';

function OperaDetails({performance:p,onClose}:{performance:EventRow['performance'];onClose:()=>void}){
 const dialogRef=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const dialog=dialogRef.current!;const opener=document.activeElement as HTMLElement|null;const overflow=document.body.style.overflow;dialog.showModal();document.body.style.overflow='hidden';return()=>{dialog.close();document.body.style.overflow=overflow;if(opener?.isConnected)opener.focus();};},[]);
 const intro=operaIntroduction({title:p.title,description:p.description??null});

 const location=[p.neighborhood,p.borough].filter(Boolean).join(', ');
 return <dialog ref={dialogRef} className="club-opera-details" aria-labelledby="club-detail-title" onCancel={e=>{e.preventDefault();onClose();}}>
  <button className="club-detail-close" autoFocus onClick={onClose} aria-label="Close opera details">×</button>
  <header><p className="club-kicker">{p.company}</p><h2 id="club-detail-title">{p.title}</h2>{p.composer&&<p className="club-detail-composer">{p.composer}</p>}<p>{dateLabel(p.date)} · {timeLabel(p.time)}{p.time?' ET':''}</p><span className="event-kind">{p.kind==='screening'?'Cinema screening':p.kind==='concert'?'Concert':'Staged opera'}</span></header>
  <img className="club-detail-art" src={`/images/operas/${artFor(p.title)||'hero'}.jpg`} alt={`Concept illustration inspired by ${p.title}`} width={1536} height={1024}/>
  <div className="club-detail-body">
   {p.ticketUrl&&/^https:\/\//.test(p.ticketUrl)&&p.status!=='cancelled'&&<section className="club-detail-tickets"><a className="club-card-buy" href={p.ticketUrl} target="_blank" rel="noopener noreferrer">Check tickets with the presenter</a><p className="club-fine-print">Checking tickets does not mark you as attending. Buy through the presenter, then choose “I’m going” when you decide to join.</p></section>}
   <section aria-labelledby="club-synopsis-title"><h3 id="club-synopsis-title">Synopsis</h3><p>{intro.text}</p>{intro.source&&<a href={intro.source} target="_blank" rel="noopener noreferrer">More about the opera</a>}</section>
   <section aria-labelledby="club-venue-title"><h3 id="club-venue-title">Venue</h3><p><strong>{p.venue||'Venue to be confirmed'}</strong>{location&&<><br/>{location}</>}</p>{p.kind==='screening'&&<p>This is a cinema screening, rather than a live performance at the opera house.</p>}{p.venue&&<a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.venue+' New York City')}`} target="_blank" rel="noopener noreferrer">View venue on map</a>}<p className="club-fine-print">Check the presenter’s venue information for entrances, accessibility, and arrival guidance.</p></section>
   {(p.runtime||p.language)&&<dl className="club-detail-facts">{p.runtime&&<div><dt>Running time</dt><dd>{p.runtime}</dd></div>}{p.language&&<div><dt>Language</dt><dd>{p.language}</dd></div>}</dl>}

  </div>
 </dialog>;
}

function Attendees({row,onProfile,onToggleCircle,circleOpen}:{row:EventRow;onProfile:(person:Person)=>void;onToggleCircle:()=>void;circleOpen:boolean}){
 const self=row.mine==='going'&&row.total>0;
 const others=Math.max(0,row.total-row.people.length-(self?1:0));
 return <section className="club-attendance" aria-label="Who is going">
  <p className="club-attendance-total"><strong>{row.total}</strong> {row.total===1?'member':'members'} going{self?' · including you':''}</p>
  {row.total===0?<p className="club-fine-print">Be the first in the club to make a plan.</p>:<>
   <div className="club-attendees">
    {self&&<span className="club-attendee-self">You</span>}
    {row.people.map(person=>{const content=<><span aria-hidden="true">{person.display_name.charAt(0)}</span><span className="club-attendee-copy"><strong>{person.display_name}</strong></span></>;return <button type="button" key={person.id} aria-label={`View profile of ${person.display_name}`} aria-haspopup="dialog" title={person.relationship} onClick={()=>onProfile(person)}>{content}</button>;})}
   </div>
   {others>0&&<div className="club-anonymous-attendees"><span className="club-anonymous-avatar" aria-hidden="true">+{others}</span><span>{others} other {others===1?'member':'members'} going</span></div>}
  </>}
  <button type="button" className="club-view-circle" aria-expanded={circleOpen} aria-controls={circleOpen?`inline-plan-${row.performance.id}`:undefined} onClick={onToggleCircle}>{circleOpen?'Close friends’ circle':'View friends’ circle'} <span aria-hidden="true">{circleOpen?'↑':'↓'}</span></button>
 </section>;
}

export function FriendProfile({person,api,onClose,onMessage}:{person:Person;api:ClubApi;onClose:()=>void;onMessage:(id:string)=>void}){
 const modal=useRef<HTMLDialogElement>(null);
 const [profile,setProfile]=useState<ClubProfileData|null>(null);
 const [error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  const dialog=modal.current!;const opener=document.activeElement as HTMLElement|null;const overflow=document.body.style.overflow;
  dialog.showModal();document.body.style.overflow='hidden';let current=true;
  void api<ClubProfileData>('profile_view',{id:person.id}).then(data=>{if(current)setProfile(data);}).catch(()=>{if(current)setError('This profile is unavailable.');});
  return()=>{current=false;dialog.close();document.body.style.overflow=overflow;if(opener?.isConnected)opener.focus();};
 },[api,person.id,retry]);
 return <dialog ref={modal} className="club-conversation-dialog club-friend-profile" aria-labelledby="club-profile-name" onCancel={onClose}><button className="club-conversation-close" aria-label="Close profile" onClick={onClose}>×</button><div className="club-profile-content"><div className="club-avatar" aria-hidden="true">{profile?.photos[0]?<img src={profile.photos[0]} alt="" width={90} height={90}/>:person.display_name.charAt(0)}</div><h2 id="club-profile-name">{profile?.display_name||person.display_name}</h2><p className="club-profile-relationship">{person.relationship||'Your connection'}</p>{error?<div><p role="alert">{error}</p><button onClick={()=>{setError('');setRetry(value=>value+1);}}>Retry loading profile</button></div>:!profile?<p role="status">Loading profile…</p>:<><h3>About</h3><p>{profile.bio||'No bio added yet.'}</p>{profile.interests.length>0&&<><h3>Profile interests</h3><div className="club-public-interests">{meetingInterests.filter(([value])=>profile.interests.includes(value)).map(([value,label])=><span key={value}>{label}</span>)}</div></>}{profile.photos.length>1&&<div className="club-public-photos">{profile.photos.slice(1).map((photo,index)=><img key={photo} src={photo} alt={`${profile.display_name}, photo ${index+2}`} width={200} height={200}/>)}</div>}<button className="club-primary" onClick={()=>onMessage(person.id)}>Start a chat</button></>}</div></dialog>;
}

function interestLabel(interests:string[]){return interests.map(key=>meetingInterests.find(([value])=>value===key)?.[1]).filter(Boolean).join(', ');}
function CircleInterest({interests}:{interests:string[]}){
 const known=interests.flatMap(key=>{const match=meetingInterests.find(([value])=>value===key);return match?[match]:[];});
 if(!known.length)return null;
 const paths:Record<string,ReactNode>={
  dinner:<><path d="M5 3v6m-3-6v4a3 3 0 0 0 6 0V3M5 10v11M17 3v18m0-18c-4 2-4 9 0 9"/></>,
  drinks:<><path d="m3 4 9 9 9-9H3Zm9 9v8m-5 0h10"/></>,
  champagne:<><path d="m7 3 1 7a4 4 0 0 0 8 0l1-7H7Zm5 11v7m-4 0h8M8 7h8"/></>,
  discussion:<path d="M4 4h16v12H9l-5 4V4Zm4 4h8m-8 4h5"/>,
  dating:<path d="M12 20 3 11C-2 4 7 0 12 7c5-7 14-3 9 4l-9 9Z"/>,
  friendship:<><circle cx="8" cy="7" r="3"/><circle cx="17" cy="8" r="2"/><path d="M2 21v-3a6 6 0 0 1 12 0v3m2-8a5 5 0 0 1 6 5v3"/></>
 };
 return <span className="club-circle-interest" role="img" aria-label={`Profile interests: ${interestLabel(interests)}`} title={`Profile interests: ${interestLabel(interests)}`}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[known[0][0]]}</svg>{known.length>1&&<span className="club-circle-interest-more">+{known.length-1}</span>}</span>;
}
function AttendingCircle({row,api,onMessage,onProfile,unreadCounts}:{row:EventRow;api:ClubApi;unreadCounts:Record<string,number>;onMessage:(id:string)=>void;onProfile:(person:Person)=>void}){
 const [profiles,setProfiles]=useState<Record<string,ClubProfileData>>({});
 const [ownProfile,setOwnProfile]=useState<ClubProfileData|null>(null);
 const peopleKey=JSON.stringify(row.people.map(person=>person.id));
 useEffect(()=>{
  let current=true;
  const ids=JSON.parse(peopleKey) as string[];
  void Promise.allSettled(ids.map(id=>api<ClubProfileData>('profile_view',{id}))).then(results=>{
   if(current)setProfiles(Object.fromEntries(results.flatMap((result,index)=>result.status==='fulfilled'?[[ids[index],result.value]]:[])));
  });
  void api<ClubProfileData>('profile_get').then(profile=>{if(current)setOwnProfile(profile);}).catch(()=>{});
  return()=>{current=false;};
 },[api,peopleKey]);
 const [paused,setPaused]=useState(false);
 const [listOpen,setListOpen]=useState(false);
 const orbitPeople=row.people.slice(0,4);
 const [expandedId,setExpandedId]=useState<string|null>(null);
 const [hoveredId,setHoveredId]=useState<string|null>(null);
 const scene=useRef<HTMLDivElement>(null),popover=useRef<HTMLDivElement>(null);
 const [position,setPosition]=useState({left:0,top:0});
 useEffect(()=>{
  if(!expandedId||!scene.current||!popover.current)return;
  const area=scene.current,panel=popover.current;
  const place=()=>{
   const anchor=area.querySelector<HTMLElement>('.club-friend-bubble[aria-expanded="true"]')?.parentElement;
   if(!anchor)return;
   const a=anchor.getBoundingClientRect(),r=area.getBoundingClientRect(),width=panel.offsetWidth,height=panel.offsetHeight;
   const below=a.bottom-r.top+16;
   setPosition({left:Math.max(4,Math.min(a.left-r.left+a.width/2-width/2,r.width-width-4)),top:Math.max(4,Math.min(below+height<=r.height?below:a.top-r.top-height-16,r.height-height-4))});
  };
  place();const observer=new ResizeObserver(place);observer.observe(area);observer.observe(panel);
  const dismiss=(event:PointerEvent)=>{if(event.target instanceof Element&&event.target.closest('dialog'))return;if(event.target instanceof Node&&!panel.contains(event.target)&&!area.querySelector('.club-friend-bubble[aria-expanded="true"]')?.contains(event.target))setExpandedId(null);};
  document.addEventListener('pointerdown',dismiss);
  return()=>{observer.disconnect();document.removeEventListener('pointerdown',dismiss);};
 },[expandedId]);
 const expanded=row.people.find(person=>person.id===expandedId);
 const self=row.mine==='going'&&row.total>0;
 const others=Math.max(0,row.total-row.people.length-(self?1:0));
 return <section className={`club-attending-circle club-orbiting-circle${row.people.length===0?' is-empty':row.people.length<=2?' is-small-circle':''}${paused||expanded||hoveredId?' is-paused':''}`} aria-label={`Friends attending ${row.performance.title}`}>
  <div className="club-circle-heading"><div><p>{row.total} {row.total===1?'member':'members'} going{self?' · including you':''}</p></div>{row.people.length>0&&<button className="club-circle-motion" aria-pressed={paused} onClick={()=>setPaused(value=>!value)}>{paused?'Resume motion':'Pause motion'}</button>}</div>
  <div className="club-circle-scene" ref={scene} onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();scene.current?.querySelector<HTMLButtonElement>('.club-friend-bubble[aria-expanded="true"]')?.focus();setExpandedId(null);}}}>
   {row.people.length>0&&<div className="club-circle-orbit" aria-hidden="true"/>}
   {self&&row.people.length>0&&<div className="club-circle-you"><span>{ownProfile?.photos[0]?<img className="club-circle-photo" src={ownProfile.photos[0]} alt="Your profile" width={78} height={78}/>:"You"}<CircleInterest interests={ownProfile?.interests||[]}/></span></div>}
   {orbitPeople.map((person,index)=><div className={`club-orbit-rotor${expandedId===person.id?' is-expanded':''}${hoveredId===person.id?' is-hovered':''}`} key={person.id} style={{'--orbit-start':`${-90+index*360/Math.max(1,orbitPeople.length)}deg`} as CSSProperties}><div className="club-orbit-satellite"><div className="club-orbit-upright"><button className="club-friend-bubble" onPointerEnter={event=>{if(event.pointerType!=='touch')setHoveredId(person.id)}} onPointerLeave={()=>setHoveredId(null)} aria-label={`View ${person.display_name}${unreadCounts[person.id]>0?` · ${unreadCounts[person.id]} unread ${unreadCounts[person.id]===1?'message':'messages'}`:''}${profiles[person.id]?.interests.length?` · ${interestLabel(profiles[person.id].interests)}`:''}`} aria-expanded={expandedId===person.id} onClick={()=>setExpandedId(expandedId===person.id?null:person.id)} title={person.relationship}><span className="club-circle-portrait">{profiles[person.id]?.photos[0]?<img className="club-circle-photo" src={profiles[person.id].photos[0]} alt="" width={78} height={78}/>:<span className="club-friend-initial" aria-hidden="true">{person.display_name.charAt(0)}</span>}</span><strong className="club-circle-name">{person.display_name}</strong><CircleInterest interests={profiles[person.id]?.interests||[]}/>{unreadCounts[person.id]>0&&<span className="club-circle-unread" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 3v-3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="M7 9h10M7 13h6"/></svg><span>{unreadCounts[person.id]>99?'99+':unreadCounts[person.id]}</span></span>}</button></div></div></div>)}
   {row.people.length===0&&<p className="club-circle-empty">{self?'No one in your circle has joined this opera yet.':'No attending friends to show.'}</p>}
  {expanded&&<div ref={popover} style={position} className="club-expanded-friend club-friend-popover" role="region" aria-label={`${expanded.display_name} connection`}><div><strong>{expanded.display_name}</strong><p>{expanded.relationship||'Your connection'}</p>{profiles[expanded.id]?.interests.length>0&&<p className="club-circle-interests">Profile interests: {interestLabel(profiles[expanded.id].interests)}</p>}</div><button className="club-collapse-friend" aria-label="Close friend options" onClick={()=>{scene.current?.querySelector<HTMLButtonElement>('.club-friend-bubble[aria-expanded="true"]')?.focus();setExpandedId(null);}}>×</button><div className="club-friend-actions"><button onClick={()=>onProfile(expanded)}>View profile</button><button className="club-primary" onClick={()=>onMessage(expanded.id)}>{unreadCounts[expanded.id]>0?'Read messages':'Start a chat'}</button></div></div>}
  </div>
  {row.people.length>4&&<button className="club-circle-list-toggle" aria-expanded={listOpen} onClick={()=>setListOpen(value=>!value)}>{listOpen?'Hide friends list':`View all ${row.people.length} friends (+${row.people.length-4})`}</button>}
  {listOpen&&<ul className="club-circle-member-list">{row.people.map(person=><li key={person.id}><button onClick={()=>onProfile(person)}>{profiles[person.id]?.photos[0]&&<img src={profiles[person.id].photos[0]} alt="" width={36} height={36}/>}<span>{person.display_name}</span><CircleInterest interests={profiles[person.id]?.interests||[]}/></button><button onClick={()=>onMessage(person.id)}>{unreadCounts[person.id]>0?`Read ${unreadCounts[person.id]} messages`:"Chat"}</button></li>)}</ul>}
  <p className="club-circle-caption">{row.people.length>0?'Select a friend to view their profile or chat.':''}{others>0?` ${others} other ${others===1?'member is':'members are'} going · names stay private.`:''}</p>
 </section>;
}

function OperaCarousel({children,count,compact=false}:{children:ReactNode;count:number;compact?:boolean}){
 const track=useRef<HTMLDivElement>(null);
 const [edges,setEdges]=useState({start:true,end:false});
 const update=useCallback(()=>{const el=track.current;if(el)setEdges({start:el.scrollLeft<=2,end:el.scrollLeft+el.clientWidth>=el.scrollWidth-2});},[]);
 useEffect(()=>{const el=track.current;if(!el)return;const observer=new ResizeObserver(update);observer.observe(el);update();return()=>observer.disconnect();},[count,compact,update]);
 function move(direction:number){const el=track.current;if(!el)return;const first=el.firstElementChild as HTMLElement|null;el.scrollBy({left:direction*((first?.offsetWidth||el.clientWidth)+24),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
 if(compact)return <div className="club-opera-list" role="region" aria-label="Opera performances"><p className="club-result-count">{count} {count===1?'performance':'performances'}</p><div className="club-list-items">{children}</div></div>;
 return <div className="club-opera-carousel" role="region" aria-label="Opera performances" aria-roledescription="carousel">
  <div className="club-carousel-controls"><span>{count} {count===1?'performance':'performances'}</span><div><button aria-label="Previous opera" disabled={edges.start} onClick={()=>move(-1)}>←</button><button aria-label="Next opera" disabled={edges.end} onClick={()=>move(1)}>→</button></div></div>
  <div className="club-evenings" ref={track} onScroll={update} tabIndex={0} aria-label="Scroll through opera performances" onKeyDown={event=>{if(event.target!==event.currentTarget)return;if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();move(event.key==='ArrowRight'?1:-1);}}}>{children}</div>
 </div>;
}

export default function ClubActivity({api,view,onView,onPlansCount}:{api:ClubApi;view:ActivityView;onView:(view:ActivityView)=>void;onPlansCount:(count:number)=>void}){
 const [filtersOpen,setFiltersOpen]=useState(false);
 const [goingOnly,setGoingOnly]=useState(false);
 const [profilePerson,setProfilePerson]=useState<Person|null>(null);
 const [selectedOperaId,setSelectedOperaId]=useState('');
 const [expandedPlanId,setExpandedPlanId]=useState('');
 const inlinePlan=useRef<HTMLElement>(null);
 const circleOpener=useRef<HTMLElement|null>(null);
 useEffect(()=>{if(view==='calendar'&&expandedPlanId){inlinePlan.current?.focus({preventScroll:true});inlinePlan.current?.scrollIntoView({block:'nearest'});}},[expandedPlanId,view]);
 function closeInlinePlan(id:string){setExpandedPlanId('');(circleOpener.current?.isConnected?circleOpener.current:document.getElementById(`circle-toggle-${id}`))?.focus();}
 function toggleCircle(id:string){if(expandedPlanId===id){closeInlinePlan(id);return;}circleOpener.current=document.activeElement as HTMLElement|null;setExpandedPlanId(id);}
 const [detail,setDetail]=useState<EventRow['performance']|null>(null);
 const [events,setEvents]=useState<EventRow[]>([]),[contacts,setContacts]=useState<Contact[]>([]),[thread,setThread]=useState<Thread|null>(null);
 const [selected,setSelected]=useState(''),[draft,setDraft]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[hasEarlier,setHasEarlier]=useState(false);
 const conversationDialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{
  if(!selected)return;
  const modal=conversationDialog.current;if(!modal)return;
  const opener=document.activeElement as HTMLElement|null;
  const overflow=document.body.style.overflow;
  modal.showModal();document.body.style.overflow='hidden';
  return()=>{modal.close();document.body.style.overflow=overflow;if(opener?.isConnected)opener.focus();};
 },[selected,view]);
 const [company,setCompany]=useState(''),[query,setQuery]=useState(''),[venue,setVenue]=useState('');
 const [mode,setMode]=useState<'list'|'month'>('list'),[selectedMonth,setMonth]=useState('');
 const filterCount=Number(mode==='month')+Number(Boolean(company))+Number(Boolean(venue));
 function clearFilters(){setGoingOnly(false);setQuery('');setCompany('');setVenue('');setMode('list');}
 const refresh=useCallback(async()=>{
  const rowsRequest=view==='messages'?Promise.resolve([] as EventRow[]):api<EventRow[]>(view==='plans'?'plans':'calendar');
  const [rows,people,plans]=await Promise.all([rowsRequest,api<Contact[]>('inbox'),view==='plans'||view==='messages'?rowsRequest:api<EventRow[]>('plans')]);
  setEvents(rows);setContacts(people);onPlansCount(plans.length);
 },[api,view,onPlansCount]);
 useEffect(()=>{let current=true;
  const load=async()=>{try{const rowsRequest=view==='messages'?Promise.resolve([] as EventRow[]):api<EventRow[]>(view==='plans'?'plans':'calendar');
  const [rows,people,plans]=await Promise.all([rowsRequest,api<Contact[]>('inbox'),view==='plans'||view==='messages'?rowsRequest:api<EventRow[]>('plans')]);if(current){setEvents(rows);setContacts(people);onPlansCount(plans.length);}}catch(e){if(current)setError(e instanceof Error?e.message:'Could not load the club.');}finally{if(current)setLoading(false);}};
  void load();const timer=setInterval(()=>void load(),15000);return()=>{current=false;clearInterval(timer);};
 },[api,view,onPlansCount]);
 useEffect(()=>{if(!selected)return;let current=true,first=true;
  const load=async()=>{try{const next=await api<Thread>('thread',{id:selected});if(!current)return;if(first){setHasEarlier(next.messages.length===50);first=false;}setThread(previous=>combineThread(previous,next));const last=next.messages.at(-1);if(last){await api('mark_read',{id:selected,through:last.id});if(current){setContacts(people=>people.map(p=>p.id===selected?{...p,unread:0}:p));window.dispatchEvent(new Event('club-messages-read'));}}}catch(e){if(current)setError(e instanceof Error?e.message:'Could not load messages.');}};
  void load();const timer=setInterval(()=>void load(),10000);return()=>{current=false;clearInterval(timer);};
 },[api,selected,view]);
 async function action(fn:()=>Promise<void>){setBusy(true);setError('');try{await fn();}catch(e){setError(e instanceof Error?e.message:'Please try again.');}finally{setBusy(false);}}
 function openThread(id:string){if(busy)return;if(id===selected)return;setHasEarlier(false);setThread(null);setSelected(id);setDraft('');setError('');}
 const month=selectedMonth||events[0]?.performance.date.slice(0,7)||new Date().toISOString().slice(0,7);
 const availableMonths=[...new Set(events.map(row=>row.performance.date.slice(0,7)))].sort();
 const monthOptions=availableMonths.map(value=>({value,label:new Date(`${value}-01T12:00:00`).toLocaleDateString('en-US',{month:'long',year:'numeric'})}));
 const unreadCounts=Object.fromEntries(contacts.map(person=>[person.id,person.unread]));
 const selectedPerson=contacts.find(p=>p.id===selected);
 const companies=[...new Set(events.map(row=>row.performance.company))].sort();
 const venues=[...new Set(events.map(row=>row.performance.venue).filter(Boolean))].sort();
 const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const matching=events.filter(row=>(!goingOnly||Boolean(row.mine))&&(view==='plans'||((!company||row.performance.company===company)&&(!venue||row.performance.venue===venue)&&normalize(`${row.performance.title} ${row.performance.composer||''}`).includes(normalize(query.trim())))));
 const shown=matching.filter(row=>view==='plans'||mode==='list'||row.performance.date.startsWith(month));

 const expandedPlan=view==='calendar'?shown.find(row=>row.performance.id===expandedPlanId):undefined;
 const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/New_York'});
 const activePlan=shown.find(row=>row.performance.id===selectedOperaId)||shown.find(row=>row.performance.date>=today)||shown[0];
 const needsAttention=events.filter(row=>row.mine==='reconfirm'||row.mine==='cancelled');
 return <section className={`club-activity${view==='calendar'?' club-discover-page':''}${view==='plans'?' club-plans-page club-discover-page':''}`} aria-label="Club activity">
  <div className="club-discovery-content">
  {view!=='messages'?<header className="club-member-welcome club-calendar-welcome" id="club-results"><div><p className="club-kicker">Your private opera circle · New York</p><h1>{view==='plans'?'Your shared evenings.':'Find your next shared evening.'}</h1><p>{view==='plans'?'Select an opera to see your attending circle, buy tickets, and chat about where to meet.':'Select an opera to see your circle. Choose “I’m going” to join them, then arrange your evening together.'}</p></div></header>:null}
  {error&&<div className="club-notice" role="alert"><p>{error}</p><button disabled={busy} onClick={()=>void action(refresh)}>Retry loading</button></div>}
  {view!=='messages'&&needsAttention.length>0&&<aside className="club-notice" role="status">{needsAttention.length} of your plans need attention. Review changed or cancelled performances below.</aside>}
  {view==='calendar'&&<><div className="club-attendance-filter" role="group" aria-label="Attendance filter"><button aria-pressed={!goingOnly} onClick={()=>setGoingOnly(false)}>All operas</button><button aria-pressed={goingOnly} onClick={()=>setGoingOnly(true)}>I’m going <span>{events.filter(row=>Boolean(row.mine)).length}</span></button></div><div className="club-discovery-filters" role="search" aria-label="Find an opera">
   <label>Search operas or composers<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Try Macbeth or Mozart"/></label>
   <button type="button" className="club-mobile-filters-toggle" aria-expanded={filtersOpen} aria-controls="club-secondary-filters" onClick={()=>setFiltersOpen(value=>!value)}>{filtersOpen?'Close filters':'Filters'}{filterCount>0?` (${filterCount})`:""}</button>
   <div id="club-secondary-filters" className={`club-secondary-filters${filtersOpen?" is-open":""}`}><ClubFilterSelect label="When" value={mode==='month'?month:''} onChange={value=>{setMode(value?'month':'list');setMonth(value);}} options={[{value:'',label:'Any date'},...monthOptions]}/>
   <ClubFilterSelect label="Opera company" value={company} onChange={value=>{setCompany(value);}} options={[{value:'',label:'All companies'},...companies.map(name=>({value:name,label:name}))]}/>
   <ClubFilterSelect label="Venue" value={venue} onChange={value=>{setVenue(value);}} options={[{value:'',label:'All venues'},...venues.map(name=>({value:name,label:name}))]}/></div>
  </div>{shown.length>0&&(query||company||venue||mode==='month')&&<button className="club-text club-clear-filters" onClick={clearFilters}>Clear filters</button>}</>}


  {view==='messages'&&<section className="club-inbox-list" aria-label="Your conversations"><h2>Messages</h2><p>Select someone in your circle to chat.</p>{loading?<p role="status">Loading conversations…</p>:contacts.length===0?<p>No conversations yet. Invite a friend to start your circle.</p>:<ul>{contacts.map(person=><li key={person.id}><button onClick={()=>openThread(person.id)}><span>{person.display_name}</span><span>{person.unread>0?`${person.unread} unread`:person.can_message?'Open chat':'Read conversation'}</span></button></li>)}</ul>}</section>}
  {view!=='messages'&&<p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{loading?'Loading performances':`${shown.length} matching ${shown.length===1?'performance':'performances'}`}</p>}
  {view!=='messages'&&(loading?<p role="status">Loading evenings…</p>:shown.length===0?<div className="club-panel"><h2>{view==='plans'?'Your next evening starts here.':'No matching performances.'}</h2><p>{view==='plans'?'Choose an opera in Discover and select “I’m going.”':'Try a different search or clear your filters.'}</p><button onClick={()=>{clearFilters();onView('calendar');}}>{view==='plans'?'Explore operas':'Clear filters'}</button></div>:<OperaCarousel key={`${view}-${mode}-${month}-${company}-${venue}-${query}-${goingOnly}`} count={shown.length} compact={false}>{shown.map((row,index)=>{const p=row.performance;return <div key={p.id} className="club-opera-slide" role="group" aria-label={`${index+1} of ${shown.length}: ${p.title}`}>
   <article className={`club-evening club-refined-card${(view==='plans'&&activePlan?.performance.id===p.id)||expandedPlanId===p.id?' is-selected-plan':''}`}>
    <div className="club-card-heading">
     <p className="club-card-date">{dateLabel(p.date)} · {timeLabel(p.time)}{p.time?' ET':''}</p>
     <h2>{view==='plans'?<button className="club-plan-select" aria-label={`Show friends for ${p.title}, ${dateLabel(p.date)}, ${timeLabel(p.time)}`} aria-pressed={activePlan?.performance.id===p.id} aria-controls="selected-opera-circle" onClick={()=>{setSelectedOperaId(p.id);}}>{p.title}</button>:<button type="button" id={`circle-toggle-${p.id}`} className="club-circle-select" aria-label={`Show friends attending ${p.title}, ${dateLabel(p.date)}`} aria-expanded={expandedPlanId===p.id} aria-controls={expandedPlanId===p.id?`inline-plan-${p.id}`:undefined} onClick={()=>toggleCircle(p.id)}>{p.title}</button>}</h2>
     <p className="club-card-meta">{p.company} · {p.venue||'Venue to be confirmed'}</p>
     {p.composer&&<p className="club-card-composer">{p.composer}</p>}
     <div className="club-card-labels"><span className="event-kind">{p.kind==='screening'?'Opera screening':p.kind==='concert'?'Concert':'Staged opera'}</span><button className="club-card-details" aria-label={`Opera details for ${p.title}, ${dateLabel(p.date)}`} aria-haspopup="dialog" onClick={()=>setDetail(p)}>Opera details</button></div>
     {(p.verification==='secondary'||p.status==='unconfirmed')&&<p className="club-fine-print">Confirm current details with the presenter.</p>}
    </div>
    <div className="club-evening-action">
     {view==='plans'&&p.ticketUrl&&/^https:\/\//.test(p.ticketUrl)&&p.status!=='cancelled'&&<a className="club-card-buy" href={p.ticketUrl} target="_blank" rel="noopener noreferrer" aria-label={`Buy tickets for ${p.title}, ${dateLabel(p.date)} (opens in a new tab)`}>Buy tickets</a>}
     {row.mine==='going'&&<span className="club-going-status" role="status">✓ You’re going</span>}
     {row.mine==='reconfirm'&&<p role="status">Details changed. Review before reconfirming.</p>}
     {(row.mine==='cancelled'||p.status==='cancelled')?<strong>Cancelled</strong>:row.mine!=='going'&&<button className="club-primary" disabled={busy} onClick={()=>void action(async()=>{await api('attend',{id:p.id,revision:row.revision});await refresh();if(view==='calendar'){circleOpener.current=document.getElementById(`circle-toggle-${p.id}`);setExpandedPlanId(p.id);}})}>{row.mine==='reconfirm'?'Reconfirm attendance':'I’m going'}</button>}
     {row.mine&&<button type="button" className="club-remove-plan" disabled={busy} aria-label={`Not going anymore to ${p.title}, ${dateLabel(p.date)}`} onClick={()=>void action(async()=>{await api('withdraw',{id:p.id});await refresh();})}>Not going anymore</button>}
    </div>
    <div className="club-evening-art"><img src={`/images/operas/${artFor(p.title)||'hero'}.jpg`} alt={artFor(p.title)?`Concept illustration inspired by ${p.title}`:'Illustrated opera evening in New York'} loading="lazy" decoding="async" width={1536} height={1024}/></div>
    {view!=='plans'&&<Attendees row={row} onProfile={setProfilePerson} circleOpen={expandedPlanId===p.id} onToggleCircle={()=>toggleCircle(p.id)}/>}
   </article>

  </div>;})}</OperaCarousel>)}
   {expandedPlan&&<section ref={inlinePlan} id={`inline-plan-${expandedPlan.performance.id}`} className="club-inline-plan" tabIndex={-1} aria-labelledby={`inline-plan-heading-${expandedPlan.performance.id}`} onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();closeInlinePlan(expandedPlan.performance.id);}}}>
    <div className="club-inline-plan-heading"><h3 id={`inline-plan-heading-${expandedPlan.performance.id}`}>Your circle · {expandedPlan.performance.title}</h3><button type="button" aria-label={`Close your plan for ${expandedPlan.performance.title}`} onClick={()=>closeInlinePlan(expandedPlan.performance.id)}>×</button></div>
    <p className="club-circle-performance-date">{dateLabel(expandedPlan.performance.date)} · {timeLabel(expandedPlan.performance.time)}{expandedPlan.performance.time?' ET':''}</p>
    <AttendingCircle key={expandedPlan.performance.id} row={expandedPlan} api={api} unreadCounts={unreadCounts} onMessage={openThread} onProfile={setProfilePerson}/>
    <div className="club-inline-plan-actions">
     {expandedPlan.performance.ticketUrl&&/^https:\/\//.test(expandedPlan.performance.ticketUrl)&&expandedPlan.performance.status!=='cancelled'&&<a className="club-card-buy" href={expandedPlan.performance.ticketUrl} target="_blank" rel="noopener noreferrer">Buy tickets<span className="sr-only"> for {expandedPlan.performance.title} (opens in a new tab)</span></a>}
     {expandedPlan.mine&&<button type="button" className="club-text" disabled={busy} onClick={()=>void action(async()=>{await api('withdraw',{id:expandedPlan.performance.id});await refresh();setExpandedPlanId('');})}>Not going anymore</button>}
    </div>
   </section>}
  {view==='plans'&&!loading&&activePlan&&<div id="selected-opera-circle"><a className="club-back-to-plans" href="#club-results">Back to your operas</a><div className="club-selected-opera-label" aria-live="polite"><span>Your circle for</span><strong>{activePlan.performance.title}</strong><span>{dateLabel(activePlan.performance.date)} · {timeLabel(activePlan.performance.time)}{activePlan.performance.time?' ET':''}</span></div><AttendingCircle key={activePlan.performance.id} row={activePlan} api={api} unreadCounts={unreadCounts} onMessage={openThread} onProfile={setProfilePerson}/></div>}
  {selected&&<dialog ref={conversationDialog} className="club-conversation-dialog club-message-dialog" aria-labelledby="club-conversation-title" onCancel={()=>setSelected('')}><button className="club-conversation-close" aria-label="Close conversation" onClick={()=>setSelected('')}>×</button><div className="club-chat"><h2 id="club-conversation-title">{selectedPerson?.display_name||'Private conversation'}</h2>{error&&<div><p role="alert">{error}</p><button disabled={busy} onClick={()=>void action(async()=>{const next=await api<Thread>('thread',{id:selected});setThread(previous=>combineThread(previous,next));})}>Reload conversation</button></div>}<div className="club-chat-log" role="log" aria-live="polite" aria-relevant="additions" aria-label="Messages">{thread&&hasEarlier&&<button onClick={()=>void action(async()=>{const older=await api<Thread>('thread',{id:selected,before:thread.messages[0].id});setHasEarlier(older.messages.length===50);setThread(previous=>combineThread(previous,older));})}>Load earlier messages</button>}{thread?.messages.map(message=><div key={message.id} className={message.mine?'club-message mine':'club-message'}><small>{message.mine?'You':selectedPerson?.display_name}</small><p>{messageText(message.body)}</p><time dateTime={message.created_at}>{new Date(message.created_at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</time></div>)}{!thread&&<p role="status">Loading conversation…</p>}{thread?.messages.length===0&&<p>No messages yet. Say hello.</p>}</div>{thread?.can_message?<form onSubmit={e=>{e.preventDefault();void action(async()=>{await api('send',{id:selected,body:draft});setDraft('');const next=await api<Thread>('thread',{id:selected});setThread(previous=>combineThread(previous,next));await refresh();});}}><label>Message<textarea value={draft} onChange={e=>setDraft(e.target.value)} maxLength={2000} rows={3} required placeholder="Suggest a time and place to meet…"/></label><div className="club-actions"><button className="club-primary" disabled={busy||!draft.trim()}>Send message</button><span className="club-fine-print">{draft.length}/2000 · No read receipts or online status shared.</span></div></form>:thread&&<p>This conversation is read-only. Existing messages are kept.</p>}</div></dialog>}
 {profilePerson&&<FriendProfile person={profilePerson} api={api} onClose={()=>setProfilePerson(null)} onMessage={id=>{setProfilePerson(null);openThread(id);}}/>}
 {detail&&<OperaDetails performance={detail} onClose={()=>setDetail(null)}/>}
 </div></section>;
}
