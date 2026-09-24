'use client';
import {useRef,useState} from 'react';
const PLAYER_ORIGIN='https://www.youtube-nocookie.com';
export default function HeroVideo(){
 const [enabled,setEnabled]=useState(false),[ready,setReady]=useState(false),[muted,setMuted]=useState(true);
 const playerRef=useRef<HTMLIFrameElement>(null);
 const send=(func:string,args:unknown[]=[])=>playerRef.current?.contentWindow?.postMessage(JSON.stringify({event:'command',func,args}),PLAYER_ORIGIN);
 const toggleSound=()=>{if(muted){send('unMute');send('setVolume',[70]);send('playVideo');}else send('mute');setMuted(x=>!x);};
 const stop=()=>{setEnabled(false);setReady(false);setMuted(true);};
 return <>
  <div className="hero-film callas-film" aria-hidden="true">
   {enabled&&<iframe ref={playerRef} title="Maria Callas — Vissi d’arte, The Ed Sullivan Show, New York, 1956"
    src={`${PLAYER_ORIGIN}/embed/ggywso5O9zw?autoplay=1&mute=1&playsinline=1&loop=1&playlist=ggywso5O9zw&rel=0&controls=0&disablekb=1&enablejsapi=1`}
    onLoad={()=>setReady(true)} tabIndex={-1} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>}
  </div>
  <div className="hero-film-tools">
   {enabled?<><button type="button" className="hero-film-toggle" onClick={toggleSound} disabled={!ready} aria-pressed={!muted} aria-label={muted?'Turn on sound for the Maria Callas video':'Mute the Maria Callas video'}>{muted?'Sound on':'Sound off'}</button><button type="button" className="hero-film-toggle" onClick={stop}>Hide video</button></>:<><button type="button" className="hero-film-toggle" onClick={()=>setEnabled(true)} aria-describedby="video-privacy-note">Play video</button><span id="video-privacy-note">Loads YouTube. <a href="#privacy">Privacy</a></span></>}
  </div>
 </>;
}
