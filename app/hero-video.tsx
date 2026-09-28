'use client';
import {useEffect,useRef,useState} from 'react';

const VIDEO_ID='ggywso5O9zw';
type Player={mute:()=>void;unMute:()=>void;setVolume:(n:number)=>void;playVideo:()=>void;destroy:()=>void;getIframe:()=>HTMLIFrameElement};
type PlayerEvent={target:Player;data?:number};
type YouTubeAPI={Player:new(element:HTMLElement,options:Record<string,unknown>)=>Player};
type YouTubeWindow=Window & {YT?:YouTubeAPI;onYouTubeIframeAPIReady?:()=>void};
let apiPromise:Promise<YouTubeAPI>|undefined;
function loadPlayerAPI(){
 const win=window as YouTubeWindow;
 if(win.YT?.Player)return Promise.resolve(win.YT);
 if(apiPromise)return apiPromise;
 apiPromise=new Promise<YouTubeAPI>((resolve,reject)=>{
  const script=document.createElement('script');
  const previous=win.onYouTubeIframeAPIReady;
  const timer=setTimeout(()=>fail(),15000);
  function fail(){clearTimeout(timer);script.remove();win.onYouTubeIframeAPIReady=previous;apiPromise=undefined;reject(new Error('YouTube unavailable'));}
  win.onYouTubeIframeAPIReady=()=>{clearTimeout(timer);previous?.();if(win.YT)resolve(win.YT);};
  script.src='https://www.youtube.com/iframe_api';script.async=true;
  // YouTube propagates this nonce to its widget script; no CSP relaxation needed.
  script.nonce=document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce??'';
  script.onerror=fail;document.head.appendChild(script);
 });
 return apiPromise;
}
export default function HeroVideo(){
 const [enabled,setEnabled]=useState(false),[status,setStatus]=useState<'loading'|'playing'|'paused'|'blocked'|'error'>('loading'),[muted,setMuted]=useState(true);
 const [attempt,setAttempt]=useState(0);
 const hostRef=useRef<HTMLDivElement>(null),playerRef=useRef<Player|null>(null);
 useEffect(()=>{
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const connection=(navigator as Navigator & {connection?:{saveData?:boolean}}).connection;
  const sync=()=>{setEnabled(!motion.matches&&!connection?.saveData);setStatus('loading');setMuted(true);};
  sync();motion.addEventListener('change',sync);
  return()=>motion.removeEventListener('change',sync);
 },[]);
 useEffect(()=>{
  if(!enabled||!hostRef.current)return;
  const host=hostRef.current;
  let active=true,player:Player|undefined;
  const timer=setTimeout(()=>{if(active)setStatus('error');},20000);
  const fail=()=>{if(active){clearTimeout(timer);setStatus('error');}};
  loadPlayerAPI().then(api=>{
   if(!active)return;
   const mount=document.createElement('div');host.appendChild(mount);
   player=new api.Player(mount,{videoId:VIDEO_ID,playerVars:{autoplay:1,mute:1,playsinline:1,loop:1,playlist:VIDEO_ID,controls:0,disablekb:1,rel:0,origin:window.location.origin},events:{
    onReady:({target}:PlayerEvent)=>{if(!active)return;playerRef.current=target;target.mute();target.playVideo();},
    onStateChange:({data}:PlayerEvent)=>{if(!active)return;if(data===1){clearTimeout(timer);setStatus('playing');}else if(data===2){clearTimeout(timer);setStatus('paused');}},
    onAutoplayBlocked:()=>{if(active){clearTimeout(timer);setStatus('blocked');}},
    onError:fail,
   }});
   const iframe=player.getIframe();iframe.title='Maria Callas — Vissi d’arte, The Ed Sullivan Show, New York, 1956';iframe.tabIndex=-1;iframe.referrerPolicy='strict-origin-when-cross-origin';
  }).catch(fail);
  return()=>{active=false;clearTimeout(timer);playerRef.current=null;player?.destroy();host.replaceChildren();};
 },[enabled,attempt]);
 const retry=()=>{setStatus('loading');setMuted(true);setAttempt(x=>x+1);};
 const play=()=>{playerRef.current?.mute();playerRef.current?.playVideo();setMuted(true);};
 const toggleSound=()=>{const player=playerRef.current;if(!player)return;if(muted){player.unMute();player.setVolume(70);}else player.mute();setMuted(x=>!x);};
 const visible=status==='playing'||status==='paused';
 return <>
  <div ref={hostRef} className={`hero-film callas-film${enabled&&visible?' is-ready':''}`} aria-hidden="true"/>
  <div className="hero-film-tools" aria-label="Background video controls">
   {enabled&&status==='loading'&&<span role="status" className="hero-film-status">Loading video…</span>}
   {enabled&&status==='error'&&<><span role="status" className="hero-film-status">The background video couldn’t load in this browser.</span><button type="button" className="hero-film-toggle" onClick={retry}>Retry video</button><a className="hero-film-toggle" href={`https://www.youtube.com/watch?v=${VIDEO_ID}`} target="_blank" rel="noopener noreferrer">Watch on YouTube</a></>}
   {enabled&&(status==='blocked'||status==='paused')&&<button type="button" className="hero-film-toggle" onClick={play}>Play video</button>}
   {enabled&&visible&&<button type="button" className="hero-film-toggle" onClick={toggleSound} aria-pressed={!muted} aria-label={muted?'Turn on sound for the Maria Callas video':'Mute the Maria Callas video'}>{muted?'Sound on':'Sound off'}</button>}
   {enabled?<button type="button" className="hero-film-toggle" onClick={()=>{setEnabled(false);setMuted(true);}}>Hide video</button>:<><button type="button" className="hero-film-toggle" onClick={()=>{setStatus('loading');setEnabled(true);}} aria-describedby="video-privacy-note">Play video</button><span id="video-privacy-note">Loads YouTube. <a href="/privacy">Privacy</a></span></>}
  </div>
 </>;
}
