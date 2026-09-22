'use client';

import { useEffect, useMemo, useState } from 'react';

import { formatTime, isStale, nycDate, type Performance, type Schedule } from '../lib/schedule';
const operaArtwork:Record<string,string> = {
 'macbeth':'macbeth','cosi fan tutte':'cosi-fan-tutte','la boheme':'la-boheme',
 'lincoln in the bardo':'lincoln-in-the-bardo','medea':'medea','samson et dalila':'samson-et-dalila',
 'la fanciulla del west':'la-fanciulla-del-west','silent night':'silent-night','manon':'manon','otello':'otello','parsifal':'parsifal'
};
function artworkFor(title:string){const key=title.split(' (')[0].normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();return operaArtwork[key];}
const companyOptions = ['All companies','Metropolitan Opera','New York City Opera','Heartbeat Opera','Bronx Opera','BAM'];

function formatDate(date:string, long=false){ return new Intl.DateTimeFormat('en-US',long?{weekday:'long',month:'long',day:'numeric',year:'numeric'}:{month:'short',day:'numeric'}).format(new Date(`${date}T12:00:00`)); }

function Artwork({item,large=false}:{item:Performance;large?:boolean}){
  const artwork=artworkFor(item.title);
  return <div className={`art art-${item.palette} ${artwork?'art-illustrated':''} ${large?'art-large':''}`}>
    {artwork?<img src={`/images/operas/${artwork}.jpg`} alt={`Concept illustration inspired by ${item.title}`} loading={large?'eager':'lazy'} decoding="async" width={1536} height={1024}/>:<span className="art-title" aria-hidden="true">{item.title.slice(0,1)}</span>}
    <span className="art-mark">{item.label}</span>
  </div>;
}

export default function Home(){
  const [view,setView]=useState<'discover'|'favorites'|'about'>('discover');
  const [filter,setFilter]=useState('All performances');
  const [company,setCompany]=useState('All companies');
  const [selected,setSelected]=useState<Performance|null>(null);
  const [favorites,setFavorites]=useState<string[]>([]);
  const [askOpen,setAskOpen]=useState(false);
  const [schedule,setSchedule]=useState<Schedule|null>(null);
  const [feedError,setFeedError]=useState(false);
  const [today,setToday]=useState(nycDate());
  const [favoritesLoaded,setFavoritesLoaded]=useState(false);
  const [kind,setKind]=useState('all');
  const performances=schedule?.performances ?? [];

  useEffect(()=>{
    const controller=new AbortController();
    const refresh=async()=>{try{
      const response=await fetch('/api/performances',{signal:controller.signal});
      if(!response.ok)throw new Error('Schedule unavailable');
      const data:Schedule=await response.json();
      if(!Array.isArray(data.performances)||!Array.isArray(data.sources))throw new Error('Invalid schedule');
      setSchedule(data);setFeedError(false);setToday(nycDate());
    }catch{if(!controller.signal.aborted)setFeedError(true);}};
    void refresh();const interval=setInterval(refresh,5*60*1000);
    return()=>{controller.abort();clearInterval(interval);};
  },[]);

  useEffect(()=>{ try{ const stored=JSON.parse(localStorage.getItem('ohpera-favorites')||'[]');if(Array.isArray(stored))setFavorites(stored.filter(x=>typeof x==='string')); }catch{} setFavoritesLoaded(true); },[]);
  useEffect(()=>{ if(favoritesLoaded){try{localStorage.setItem('ohpera-favorites',JSON.stringify(favorites));}catch{}} },[favorites,favoritesLoaded]);
  useEffect(()=>{ document.body.style.overflow=selected||askOpen?'hidden':''; return()=>{document.body.style.overflow='';}; },[selected,askOpen]);

  const visible=useMemo(()=>performances.filter((p)=>{
    const days=(Date.parse(p.date+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000;
    if(p.date<today)return false;
    if(kind!=='all'&&p.kind!==kind)return false;
    if(view==='favorites'&&!favorites.includes(p.id)) return false;
    if(filter==='This week'&&(days<0||days>=7)) return false;
    if(filter==='This month'&&(p.date.slice(0,7)!==today.slice(0,7))) return false;
    if(company!=='All companies'&&p.company!==company) return false;
    return true;
  }),[filter,company,view,favorites,schedule,today,kind]);

  const toggleFavorite=(id:string)=>setFavorites((current)=>current.includes(id)?current.filter((x)=>x!==id):[...current,id]);
  const navigate=(next:typeof view)=>{setView(next);setFilter('All performances');setCompany('All companies');setKind('all');window.scrollTo({top:0,behavior:'smooth'});};

  return <main>
    <header className="site-header">
      <button className="wordmark" onClick={()=>navigate('discover')} aria-label="OH-pera home">OH<span>—</span>pera!</button>
      <nav aria-label="Primary navigation">
        <button className={view==='discover'?'active':''} onClick={()=>navigate('discover')}>Discover</button>
        <button className={view==='favorites'?'active':''} onClick={()=>navigate('favorites')}>My Operas <span className="count">{favorites.length}</span></button>
        <button className={view==='about'?'active':''} onClick={()=>navigate('about')}>About</button>
      </nav>
      <button className="ask-button" onClick={()=>setAskOpen(true)}>Ask OH-pera! <span>↗</span></button>
    </header>

    {view==='about'?<About onDiscover={()=>navigate('discover')}/>:<>
      <section className={`hero ${view==='favorites'?'favorites-hero':'illustrated-hero'}`}>
        <p className="eyebrow">{view==='favorites'?'Your personal shortlist':'New York City · Upcoming opera'}</p>
        <h1>{view==='favorites'?<>The operas you<br />don’t want to miss.</>:<>What opera can<br />I see in NYC?</>}</h1>
        <p className="intro">{view==='favorites'?'Save performances that catch your eye, then find them together here.':<>Discover upcoming opera across New York, with official sources and clear information about when schedules were checked.</>}</p>
      </section>
      <section className="discover" aria-labelledby="upcoming-title">
        <div className="section-head"><div><p className="section-kicker">{view==='favorites'?'Saved for later':'On stage soon'}</p><h2 id="upcoming-title">{view==='favorites'?'My Operas':'Upcoming performances'}</h2></div><p className="result-count">{visible.length} {visible.length===1?'performance':'performances'}</p></div>
        <p className="schedule-summary" role="status">{!schedule?(feedError?'Schedules could not be loaded. Please try again shortly.':'Checking schedules…'):`${schedule.sources.length} organizations monitored · Times in New York local time · Some sources have incomplete dates.`}</p>
        {schedule?.delivery==='bundled'&&<p className="feed-notice">Showing the saved schedule snapshot. The latest automatic feed is not available yet.</p>}
        {feedError&&schedule&&<p className="feed-notice" role="status">Refresh unavailable. Previously loaded listings remain visible.</p>}
        <details className="coverage"><summary>Sources &amp; coverage {schedule&&`· ${schedule.sources.filter(s=>s.status!=='live'||isStale(s.lastSuccessAt)).length} need attention`}</summary>
          <p>Coverage currently includes five organizations, not every NYC opera company. Announcements without exact dates appear separately below.</p>
          <div className="source-grid">{schedule?.sources.map(s=><article key={s.id}>
            <a href={s.url} target="_blank" rel="noreferrer">{s.name} ↗</a>
            <strong>{s.status==='error'?'Source unavailable':s.status==='fallback'?'Secondary snapshot':s.status==='partial'?'Partial coverage':'Connected'}{isStale(s.lastSuccessAt)?' · Out of date':''}</strong>
            <p>{s.message}</p><small>{s.lastSuccessAt?`Data verified ${new Date(s.lastSuccessAt).toLocaleString('en-US',{timeZone:'America/New_York'})} ET`:'Not yet verified'}</small>
          </article>)}</div>
        </details>
        <div className="filters" aria-label="Performance filters">
          {['All performances','This week','This month'].map((item)=><button key={item} className={filter===item?'selected':''} onClick={()=>setFilter(item)}>{item}</button>)}
          <label className="company-filter"><span className="sr-only">Filter by company</span><select value={company} onChange={(e)=>setCompany(e.target.value)}>{companyOptions.map((item)=><option key={item}>{item}</option>)}</select><i>⌄</i></label>
          <label className="company-filter"><span className="sr-only">Performance type</span><select value={kind} onChange={e=>setKind(e.target.value)}><option value="all">All event types</option><option value="opera">Staged opera</option><option value="concert">Opera concerts</option><option value="screening">HD screenings</option></select><i>⌄</i></label>
        </div>
        {!schedule?<p className="loading-feed">{feedError?'The schedule feed is unavailable. Reload to retry.':'Loading verified listings…'}</p>:visible.length?<div className="performance-grid">{visible.map((p)=><article className="performance-card" key={p.id} onClick={()=>setSelected(p)} tabIndex={0} onKeyDown={(e)=>{if(e.key==='Enter')setSelected(p)}}>
          <div className="art-wrap"><Artwork item={p}/><button className={`save ${favorites.includes(p.id)?'saved':''}`} onClick={(e)=>{e.stopPropagation();toggleFavorite(p.id)}} aria-label={`${favorites.includes(p.id)?'Remove':'Save'} ${p.title}`}>{favorites.includes(p.id)?'♥':'♡'}</button></div>
          <div className="card-body"><div className="date-block"><strong>{new Date(`${p.date}T12:00:00`).getDate().toString().padStart(2,'0')}</strong><span>{new Date(`${p.date}T12:00:00`).toLocaleString('en-US',{month:'short'}).toUpperCase()}</span></div><div className="card-copy"><p className="company">{p.company}</p><h3>{p.title}</h3><p className="composer">{p.composer}</p><p className="location">{formatTime(p.time)} <span>·</span> {[p.neighborhood,p.borough].filter(Boolean).join(' · ')}</p><p className={`verification-note ${isStale(p.checkedAt)||p.status!=='scheduled'?'needs-check':''}`}>{p.status==='cancelled'?'Cancelled':p.status==='unconfirmed'?'Date needs reconfirmation':isStale(p.checkedAt)?'Older schedule — confirm with venue':p.kind==='screening'?'Cinema screening':'Source verified'}{p.verification==='secondary'?' · Secondary source':''}</p></div><span className="arrow">↗</span></div>
        </article>)}</div>:<div className="empty"><span>♪</span><h3>No operas here yet.</h3><p>{view==='favorites'?'Tap the heart on a performance to build your shortlist.':'Try another date or company filter.'}</p><button onClick={()=>{setFilter('All performances');setCompany('All companies');setKind('all');if(view==='favorites')navigate('discover')}}>Browse all performances</button></div>}
        {view==='discover'&&!!schedule?.announcements.length&&<section className="announcements"><h2>Season announcements</h2><p>These are production announcements, not confirmed individual performance sessions.</p><div>{schedule.announcements.filter(a=>company==='All companies'||a.company===company).map(a=><article key={a.id}><p className="company">{a.company}</p><h3><a href={a.sourceUrl} target="_blank" rel="noreferrer">{a.title} ↗</a></h3><p>{a.dateText}</p><small>{a.note}</small></article>)}</div></section>}
      </section>
    </>}

    <footer><div className="wordmark">OH<span>—</span>pera!</div><p>Opera across New York City, all in one place.</p><p className="footer-note">Source-linked schedules · Confirm availability with the presenter before booking. Artwork is AI-generated and inspired by each opera; it does not depict actual productions.</p></footer>

    {selected&&<div className="modal-backdrop" onMouseDown={(e)=>{if(e.currentTarget===e.target)setSelected(null)}}><section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <button className="close" onClick={()=>setSelected(null)} aria-label="Close details">×</button>
      <div className="detail-art"><Artwork item={selected} large/><button className={`detail-save ${favorites.includes(selected.id)?'saved':''}`} onClick={()=>toggleFavorite(selected.id)}>{favorites.includes(selected.id)?'♥ Saved':'♡ Save to My Operas'}</button></div>
      <div className="detail-copy"><p className="eyebrow">{selected.company}</p><h2 id="detail-title">{selected.title}</h2><p className="detail-composer">{selected.composer?`Music by ${selected.composer}`:''}</p><div className="detail-facts"><div><span>When</span><strong>{formatDate(selected.date,true)}<br/>{formatTime(selected.time)}</strong></div><div><span>Where</span><strong>{selected.venue||'Venue to be confirmed'}<br/>{[selected.neighborhood,selected.borough].filter(Boolean).join(', ')}</strong></div><div><span>Experience</span><strong>{selected.runtime||'Running time not confirmed'}<br/>{selected.language||'Language not confirmed'}</strong></div></div><p className="synopsis">{selected.description}</p><p className="verification-note">{selected.status==='cancelled'?'This performance is cancelled. ':selected.status==='unconfirmed'?'This date needs reconfirmation. ':''}Source verified {new Date(selected.checkedAt).toLocaleDateString('en-US',{timeZone:'America/New_York'})}.{selected.verification==='secondary'?' From a secondary schedule snapshot.':''} {isStale(selected.checkedAt)?'This information is older than 24 hours; check the official page.':''}</p><div className="detail-actions">{selected.status!=='cancelled'&&<a className="ticket-button" href={selected.ticketUrl||selected.sourceUrl} target="_blank" rel="noreferrer">Check dates &amp; tickets <span>↗</span></a>}<a href={selected.sourceUrl} target="_blank" rel="noreferrer" className="source-link">Official production page</a></div></div>
    </section></div>}

    {askOpen&&<div className="modal-backdrop" onMouseDown={(e)=>{if(e.currentTarget===e.target)setAskOpen(false)}}><section className="ask-modal" role="dialog" aria-modal="true" aria-labelledby="ask-title"><button className="close" onClick={()=>setAskOpen(false)} aria-label="Close">×</button><p className="eyebrow">Coming in a future act</p><h2 id="ask-title">Ask OH-pera!</h2><p>Soon, you’ll be able to ask things like “What should I see this weekend?” or “Which opera is best for a first-timer?”</p><div className="fake-input"><span>Which opera should I see this weekend?</span><button disabled>Ask ↗</button></div><small>The discovery experience comes first. AI recommendations are not part of this MVP.</small></section></div>}
  </main>;
}

function About({onDiscover}:{onDiscover:()=>void}){return <section className="about-page"><div><p className="eyebrow">About OH-pera!</p><h1>One city.<br/>Many stages.<br/>More discovery.</h1></div><div className="about-copy"><p className="about-lead">Opera in New York shouldn’t require five tabs and a perfect memory.</p><p>OH-pera! monitors the Metropolitan Opera, New York City Opera, Heartbeat Opera, Bronx Opera, and opera presented at BAM. Coverage is expanding. Some sources provide season announcements or older snapshots rather than current individual dates; each listing shows its verification status.</p><p>We don’t sell tickets. When you find something you love, we send you directly to the presenter’s official website.</p><button onClick={onDiscover}>Discover what’s on <span>↗</span></button><div className="company-list">{companyOptions.slice(1).map((name,index)=><div key={name}><span>0{index+1}</span>{name}</div>)}</div></div></section>}
