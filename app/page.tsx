'use client';

import { useEffect, useMemo, useState } from 'react';

type Performance = {
  id:string; title:string; composer:string; company:string; venue:string; borough:string; neighborhood:string;
  date:string; time:string; description:string; runtime:string; language:string; ticketUrl:string; sourceUrl:string;
  palette:string; label:string;
};

const performances:Performance[] = [
  {id:'met-boheme',title:'La Bohème',composer:'Giacomo Puccini',company:'Metropolitan Opera',venue:'Metropolitan Opera House',borough:'Manhattan',neighborhood:'Lincoln Center',date:'2026-09-24',time:'7:30 PM',description:'Four young bohemians chase love, art, and warmth in a wintry Paris garret in Puccini’s tender portrait of fragile happiness.',runtime:'2 hr 55 min',language:'Italian with English titles',ticketUrl:'https://www.metopera.org/',sourceUrl:'https://www.metopera.org/',palette:'plum',label:'ACT I'},
  {id:'heartbeat-rose',title:'The Rose Elf',composer:'David Hertzberg',company:'Heartbeat Opera',venue:'The Space at Irondale',borough:'Brooklyn',neighborhood:'Fort Greene',date:'2026-09-27',time:'8:00 PM',description:'A dark, intimate chamber opera inspired by Hans Christian Andersen, staged with Heartbeat Opera’s vivid theatrical energy.',runtime:'1 hr 30 min',language:'English',ticketUrl:'https://www.heartbeatopera.org/',sourceUrl:'https://www.heartbeatopera.org/',palette:'amber',label:'NEW'},
  {id:'nyco-carmen',title:'Carmen',composer:'Georges Bizet',company:'New York City Opera',venue:'Bryant Park',borough:'Manhattan',neighborhood:'Midtown',date:'2026-10-04',time:'6:00 PM',description:'Bizet’s unforgettable tale of freedom, desire, and fate arrives in an open-air performance in the heart of Manhattan.',runtime:'2 hr 45 min',language:'French with English titles',ticketUrl:'https://nycopera.com/',sourceUrl:'https://nycopera.com/',palette:'blue',label:'OPEN AIR'},
  {id:'bronx-butterfly',title:'Madama Butterfly',composer:'Giacomo Puccini',company:'Bronx Opera',venue:'Lehman Center for the Performing Arts',borough:'The Bronx',neighborhood:'Bedford Park',date:'2026-10-10',time:'7:30 PM',description:'Puccini’s sweeping tragedy follows Cio-Cio-San as hope, devotion, and betrayal collide in Nagasaki.',runtime:'2 hr 40 min',language:'Italian with English titles',ticketUrl:'https://bronxopera.org/',sourceUrl:'https://bronxopera.org/',palette:'coral',label:'THE BRONX'},
  {id:'bam-julie',title:'Miss Julie',composer:'Philippe Boesmans',company:'BAM',venue:'BAM Harvey Theater',borough:'Brooklyn',neighborhood:'Fort Greene',date:'2026-10-16',time:'7:30 PM',description:'Strindberg’s dangerous midsummer encounter becomes a taut contemporary opera of power, class, and desire.',runtime:'1 hr 35 min',language:'English',ticketUrl:'https://www.bam.org/',sourceUrl:'https://www.bam.org/',palette:'olive',label:'BAM OPERA'},
  {id:'met-traviata',title:'La Traviata',composer:'Giuseppe Verdi',company:'Metropolitan Opera',venue:'Metropolitan Opera House',borough:'Manhattan',neighborhood:'Lincoln Center',date:'2026-10-22',time:'7:00 PM',description:'Verdi’s radiant score illuminates the love and sacrifice of Violetta, one of opera’s most unforgettable heroines.',runtime:'3 hr 5 min',language:'Italian with English titles',ticketUrl:'https://www.metopera.org/',sourceUrl:'https://www.metopera.org/',palette:'red',label:'VERDI'},
  {id:'heartbeat-salome',title:'Salome',composer:'Richard Strauss',company:'Heartbeat Opera',venue:'The Space at Irondale',borough:'Brooklyn',neighborhood:'Fort Greene',date:'2026-10-25',time:'7:30 PM',description:'A stripped-back reimagining of Strauss’s feverish one-act opera, bringing the audience close to its dangerous obsessions.',runtime:'1 hr 45 min',language:'German with English titles',ticketUrl:'https://www.heartbeatopera.org/',sourceUrl:'https://www.heartbeatopera.org/',palette:'violet',label:'REIMAGINED'},
  {id:'bronx-flute',title:'The Magic Flute',composer:'Wolfgang Amadeus Mozart',company:'Bronx Opera',venue:'Lehman Center for the Performing Arts',borough:'The Bronx',neighborhood:'Bedford Park',date:'2026-11-01',time:'2:30 PM',description:'Mozart’s fantastical adventure pairs luminous music with trials of courage, wisdom, and love.',runtime:'2 hr 30 min',language:'English',ticketUrl:'https://bronxopera.org/',sourceUrl:'https://bronxopera.org/',palette:'night',label:'FAMILY'},
];

const DEMO_TODAY = new Date('2026-09-22T12:00:00');
const companyOptions = ['All companies', ...Array.from(new Set(performances.map((p)=>p.company)))];

function formatDate(date:string, long=false){ return new Intl.DateTimeFormat('en-US',long?{weekday:'long',month:'long',day:'numeric'}:{month:'short',day:'numeric'}).format(new Date(`${date}T12:00:00`)); }

function Artwork({item,large=false}:{item:Performance;large?:boolean}){
  return <div className={`art art-${item.palette} ${large?'art-large':''}`} role="img" aria-label={`Abstract artwork for ${item.title}`}><span className="art-mark">{item.label}</span><span className="art-title">{item.title.slice(0,1)}</span></div>;
}

export default function Home(){
  const [view,setView]=useState<'discover'|'favorites'|'about'>('discover');
  const [filter,setFilter]=useState('All performances');
  const [company,setCompany]=useState('All companies');
  const [selected,setSelected]=useState<Performance|null>(null);
  const [favorites,setFavorites]=useState<string[]>([]);
  const [askOpen,setAskOpen]=useState(false);

  useEffect(()=>{ try{ setFavorites(JSON.parse(localStorage.getItem('ohpera-favorites')||'[]')); }catch{} },[]);
  useEffect(()=>{ localStorage.setItem('ohpera-favorites',JSON.stringify(favorites)); },[favorites]);
  useEffect(()=>{ document.body.style.overflow=selected||askOpen?'hidden':''; return()=>{document.body.style.overflow='';}; },[selected,askOpen]);

  const visible=useMemo(()=>performances.filter((p)=>{
    const date=new Date(`${p.date}T12:00:00`); const days=(date.getTime()-DEMO_TODAY.getTime())/86400000;
    if(view==='favorites'&&!favorites.includes(p.id)) return false;
    if(filter==='This week'&&(days<0||days>7)) return false;
    if(filter==='This month'&&(date.getMonth()!==DEMO_TODAY.getMonth())) return false;
    if(company!=='All companies'&&p.company!==company) return false;
    return true;
  }),[filter,company,view,favorites]);

  const toggleFavorite=(id:string)=>setFavorites((current)=>current.includes(id)?current.filter((x)=>x!==id):[...current,id]);
  const navigate=(next:typeof view)=>{setView(next);setFilter('All performances');setCompany('All companies');window.scrollTo({top:0,behavior:'smooth'});};

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
      <section className={`hero ${view==='favorites'?'favorites-hero':''}`}>
        <p className="eyebrow">{view==='favorites'?'Your personal shortlist':'New York City · 2026 season'}</p>
        <h1>{view==='favorites'?<>The operas you<br />don’t want to miss.</>:<>What opera can<br />I see in NYC?</>}</h1>
        <p className="intro">{view==='favorites'?'Save performances that catch your eye, then find them together here.':<>Five stages. One view. Discover opera happening across the city without the endless searching.</>}</p>
      </section>
      <section className="discover" aria-labelledby="upcoming-title">
        <div className="section-head"><div><p className="section-kicker">{view==='favorites'?'Saved for later':'On stage soon'}</p><h2 id="upcoming-title">{view==='favorites'?'My Operas':'Upcoming performances'}</h2></div><p className="result-count">{visible.length} {visible.length===1?'performance':'performances'}</p></div>
        <div className="filters" aria-label="Performance filters">
          {['All performances','This week','This month'].map((item)=><button key={item} className={filter===item?'selected':''} onClick={()=>setFilter(item)}>{item}</button>)}
          <label className="company-filter"><span className="sr-only">Filter by company</span><select value={company} onChange={(e)=>setCompany(e.target.value)}>{companyOptions.map((item)=><option key={item}>{item}</option>)}</select><i>⌄</i></label>
        </div>
        {visible.length?<div className="performance-grid">{visible.map((p)=><article className="performance-card" key={p.id} onClick={()=>setSelected(p)} tabIndex={0} onKeyDown={(e)=>{if(e.key==='Enter')setSelected(p)}}>
          <div className="art-wrap"><Artwork item={p}/><button className={`save ${favorites.includes(p.id)?'saved':''}`} onClick={(e)=>{e.stopPropagation();toggleFavorite(p.id)}} aria-label={`${favorites.includes(p.id)?'Remove':'Save'} ${p.title}`}>{favorites.includes(p.id)?'♥':'♡'}</button></div>
          <div className="card-body"><div className="date-block"><strong>{new Date(`${p.date}T12:00:00`).getDate().toString().padStart(2,'0')}</strong><span>{new Date(`${p.date}T12:00:00`).toLocaleString('en-US',{month:'short'}).toUpperCase()}</span></div><div className="card-copy"><p className="company">{p.company}</p><h3>{p.title}</h3><p className="composer">{p.composer}</p><p className="location">{p.time} <span>·</span> {p.neighborhood} · {p.borough}</p></div><span className="arrow">↗</span></div>
        </article>)}</div>:<div className="empty"><span>♪</span><h3>No operas here yet.</h3><p>{view==='favorites'?'Tap the heart on a performance to build your shortlist.':'Try another date or company filter.'}</p><button onClick={()=>{setFilter('All performances');setCompany('All companies');if(view==='favorites')navigate('discover')}}>Browse all performances</button></div>}
      </section>
    </>}

    <footer><div className="wordmark">OH<span>—</span>pera!</div><p>Opera across New York City, all in one place.</p><p className="footer-note">MVP demo · Ticket purchases happen on official presenter websites.</p></footer>

    {selected&&<div className="modal-backdrop" onMouseDown={(e)=>{if(e.currentTarget===e.target)setSelected(null)}}><section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <button className="close" onClick={()=>setSelected(null)} aria-label="Close details">×</button>
      <div className="detail-art"><Artwork item={selected} large/><button className={`detail-save ${favorites.includes(selected.id)?'saved':''}`} onClick={()=>toggleFavorite(selected.id)}>{favorites.includes(selected.id)?'♥ Saved':'♡ Save to My Operas'}</button></div>
      <div className="detail-copy"><p className="eyebrow">{selected.company}</p><h2 id="detail-title">{selected.title}</h2><p className="detail-composer">Music by {selected.composer}</p><div className="detail-facts"><div><span>When</span><strong>{formatDate(selected.date,true)}<br/>{selected.time}</strong></div><div><span>Where</span><strong>{selected.venue}<br/>{selected.neighborhood}, {selected.borough}</strong></div><div><span>Experience</span><strong>{selected.runtime}<br/>{selected.language}</strong></div></div><p className="synopsis">{selected.description}</p><div className="detail-actions"><a className="ticket-button" href={selected.ticketUrl} target="_blank" rel="noreferrer">Get Tickets <span>↗</span></a><a href={selected.sourceUrl} target="_blank" rel="noreferrer" className="source-link">Official production page</a></div></div>
    </section></div>}

    {askOpen&&<div className="modal-backdrop" onMouseDown={(e)=>{if(e.currentTarget===e.target)setAskOpen(false)}}><section className="ask-modal" role="dialog" aria-modal="true" aria-labelledby="ask-title"><button className="close" onClick={()=>setAskOpen(false)} aria-label="Close">×</button><p className="eyebrow">Coming in a future act</p><h2 id="ask-title">Ask OH-pera!</h2><p>Soon, you’ll be able to ask things like “What should I see this weekend?” or “Which opera is best for a first-timer?”</p><div className="fake-input"><span>Which opera should I see this weekend?</span><button disabled>Ask ↗</button></div><small>The discovery experience comes first. AI recommendations are not part of this MVP.</small></section></div>}
  </main>;
}

function About({onDiscover}:{onDiscover:()=>void}){return <section className="about-page"><div><p className="eyebrow">About OH-pera!</p><h1>One city.<br/>Five stages.<br/>Every aria.</h1></div><div className="about-copy"><p className="about-lead">Opera in New York shouldn’t require five tabs and a perfect memory.</p><p>OH-pera! brings performances from the Metropolitan Opera, New York City Opera, Heartbeat Opera, Bronx Opera, and opera presented at BAM into one simple discovery experience.</p><p>We don’t sell tickets. When you find something you love, we send you directly to the presenter’s official website.</p><button onClick={onDiscover}>Discover what’s on <span>↗</span></button><div className="company-list">{companyOptions.slice(1).map((name,index)=><div key={name}><span>0{index+1}</span>{name}</div>)}</div></div></section>}
