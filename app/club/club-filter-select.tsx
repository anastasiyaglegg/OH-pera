'use client';
import {useEffect,useId,useRef,useState} from 'react';

type Option={value:string;label:string};
export default function ClubFilterSelect({label,value,options,onChange}:{label:string;value:string;options:Option[];onChange:(value:string)=>void}){
 const id=useId(),root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),list=useRef<HTMLDivElement>(null);
 const [open,setOpen]=useState(false);
 const search=useRef({text:'',at:0});
 const selected=options.find(option=>option.value===value)||options[0];
 useEffect(()=>{
  if(!open)return;
  list.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
  const dismiss=(event:PointerEvent)=>{if(event.target instanceof Node&&!root.current?.contains(event.target))setOpen(false);};
  document.addEventListener('pointerdown',dismiss);
  return()=>document.removeEventListener('pointerdown',dismiss);
 },[open]);
 function choose(next:string){onChange(next);setOpen(false);trigger.current?.focus();}
 return <div className={`club-filter-select${open?' is-open':''}`} ref={root} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false);}}>
  <span id={`${id}-label`} className="club-filter-label">{label}</span>
  <button ref={trigger} type="button" className="club-filter-trigger" aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-options`} onClick={()=>setOpen(current=>!current)} onKeyDown={event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();setOpen(true);}}}>
   <span id={`${id}-value`}>{selected?.label}</span><span className="club-filter-chevron" aria-hidden="true"/>
  </button>
  {open&&<div id={`${id}-options`} ref={list} role="listbox" aria-labelledby={`${id}-label`} className="club-filter-options" onKeyDown={event=>{
   const buttons=Array.from(list.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')||[]);
   const index=buttons.indexOf(document.activeElement as HTMLButtonElement);
   let next=-1;
   if(event.key==='ArrowDown')next=(index+1)%buttons.length;
   else if(event.key==='ArrowUp')next=(index-1+buttons.length)%buttons.length;
   else if(event.key==='Home')next=0;
   else if(event.key==='End')next=buttons.length-1;
   else if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setOpen(false);trigger.current?.focus();return;}
   else if(event.key.length===1&&!event.ctrlKey&&!event.metaKey&&event.key!==' '){
    const now=Date.now();search.current={text:(now-search.current.at<700?search.current.text:'')+event.key.toLocaleLowerCase(),at:now};
    next=options.findIndex(option=>option.label.toLocaleLowerCase().startsWith(search.current.text));
   }
   if(next>=0){event.preventDefault();buttons[next]?.focus();}
  }}>
   {options.map(option=><button key={option.value} type="button" role="option" aria-selected={value===option.value} tabIndex={-1} onClick={()=>choose(option.value)}><span className="club-filter-check" aria-hidden="true">{value===option.value?'✓':''}</span><span>{option.label}</span></button>)}
  </div>}
 </div>;
}
