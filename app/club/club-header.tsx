'use client';
import {Children,cloneElement,isValidElement,useEffect,useId,useRef,useState,type HTMLAttributes,type ReactNode} from 'react';

/** Shared glass header with a compact disclosure menu on smaller screens. */
export default function ClubHeader({children}:{children:ReactNode}){
 const [scrolled,setScrolled]=useState(false),[open,setOpen]=useState(false);
 const header=useRef<HTMLElement>(null),toggle=useRef<HTMLButtonElement>(null);
 const menuId=useId();
 const hasNavigation=Children.toArray(children).some(child=>isValidElement(child)&&child.type==='nav');
 useEffect(()=>{
  const update=()=>setScrolled(window.scrollY>24);
  const frame=requestAnimationFrame(update);
  window.addEventListener('scroll',update,{passive:true});
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',update);};
 },[]);
 useEffect(()=>{
  if(!open)return;
  const outside=(event:PointerEvent)=>{if(event.target instanceof Node&&!header.current?.contains(event.target))setOpen(false);};
  document.addEventListener('pointerdown',outside);
  return()=>document.removeEventListener('pointerdown',outside);
 },[open]);
 return <header ref={header} className={`site-header club-header club-unified-header${scrolled?' is-scrolled':''}${open?' is-menu-open':''}`} onKeyDown={event=>{if(event.key==='Escape'&&open){setOpen(false);toggle.current?.focus();}}}>
  {Children.toArray(children).filter(child=>!isValidElement(child)||child.type!=='nav')}
  {hasNavigation&&<button ref={toggle} type="button" className="club-mobile-menu-toggle" aria-expanded={open} aria-controls={menuId} onClick={()=>setOpen(value=>!value)}>{open?'Close':'Menu'} <span aria-hidden="true">{open?'×':'☰'}</span></button>}
  {Children.map(children,child=>isValidElement<HTMLAttributes<HTMLElement>>(child)&&child.type==='nav'?cloneElement(child,{id:menuId,onClick:event=>{child.props.onClick?.(event);if(!event.defaultPrevented&&event.target instanceof Element&&event.target.closest('button,a'))setOpen(false);}}):null)}
 </header>;
}
