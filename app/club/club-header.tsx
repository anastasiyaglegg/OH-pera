'use client';
import {useEffect,useState,type ReactNode} from 'react';

/** The original OH-pera floating header becomes translucent after scrolling. */
export default function ClubHeader({children}:{children:ReactNode}){
 const [scrolled,setScrolled]=useState(false);
 useEffect(()=>{
  const update=()=>setScrolled(window.scrollY>24);
  const frame=requestAnimationFrame(update);
  window.addEventListener('scroll',update,{passive:true});
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',update);};
 },[]);
 return <header className={`site-header club-header${scrolled?' is-scrolled':''}`}>{children}</header>;
}
