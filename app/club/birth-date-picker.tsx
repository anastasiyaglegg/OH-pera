'use client';
import ClubFilterSelect from './club-filter-select';
import {useId,useRef,useState} from 'react';
const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
export default function BirthDatePicker({name='dateOfBirth',defaultValue='',onChange,max}:{name?:string;defaultValue?:string;onChange?:(value:string)=>void;max?:string}){
 const calendar=useRef<HTMLElement>(null);
 const id=useId(),trigger=useRef<HTMLButtonElement>(null),input=useRef<HTMLInputElement>(null);
 const today=new Date();
 const [open,setOpen]=useState(false),[text,setText]=useState(defaultValue?defaultValue.slice(5,7)+'/'+defaultValue.slice(8,10)+'/'+defaultValue.slice(0,4):''),[value,setValue]=useState(defaultValue);
 const [year,setYear]=useState(defaultValue?Number(defaultValue.slice(0,4)):today.getFullYear()-18),[month,setMonth]=useState(defaultValue?Number(defaultValue.slice(5,7))-1:0);
 function close(){calendar.current?.hidePopover();setOpen(false);trigger.current?.focus();}
 function change(raw:string){
  setText(raw);
  const match=raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  let iso='';
  if(match){const m=Number(match[1]),d=Number(match[2]),y=Number(match[3]),date=new Date(y,m-1,d);
   if(y>=1900&&date<=today&&date.getFullYear()===y&&date.getMonth()===m-1&&date.getDate()===d){iso=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;setYear(y);setMonth(m-1);}}
  if(max&&iso>max)iso='';
  setValue(iso);onChange?.(iso);input.current?.setCustomValidity(raw&&!iso?'Enter a valid birthday as MM/DD/YYYY.':'');
 }
 function select(day:number){change(`${String(month+1).padStart(2,'0')}/${String(day).padStart(2,'0')}/${year}`);close();}
 function shift(offset:number){const date=new Date(year,month+offset,1);setYear(date.getFullYear());setMonth(date.getMonth());}
 const first=new Date(year,month,1).getDay(),days=new Date(year,month+1,0).getDate();
 return <div className="club-birthday" onKeyDown={e=>{if(open&&e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}}}>
  <label htmlFor={id}>Date of birth</label>
  <div className="club-birthday-input"><input ref={input} id={id} value={text} onChange={e=>change(e.target.value)} required placeholder="MM/DD/YYYY" inputMode="numeric" autoComplete="bday" maxLength={10}/><input type="hidden" name={name} value={value}/><button ref={trigger} type="button" aria-label={open?'Close birthday calendar':'Open birthday calendar'} aria-expanded={open} aria-controls={`${id}-calendar`} onClick={()=>calendar.current?.togglePopover()}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 2v6m10-6v6M3 11h18m-12 4h3m3 0h3m-9 3h3"/></svg></button></div>
  <section ref={calendar} popover="auto" onToggle={event=>setOpen(event.newState==='open')} className="club-birthday-calendar" id={`${id}-calendar`} aria-label="Choose your birthday">
   <div className="club-birthday-controls"><ClubFilterSelect label="Birth month" value={String(month)} onChange={value=>setMonth(Number(value))} options={months.map((label,index)=>({label,value:String(index)}))}/><ClubFilterSelect label="Birth year" value={String(year)} onChange={value=>setYear(Number(value))} options={Array.from({length:today.getFullYear()-1899},(_,i)=>({label:String(today.getFullYear()-i),value:String(today.getFullYear()-i)}))}/></div>
   <div className="club-birthday-navigation"><button type="button" aria-label="Previous month" disabled={year===1900&&month===0} onClick={()=>shift(-1)}>‹</button><span aria-live="polite">{months[month]} {year}</span><button type="button" aria-label="Next month" disabled={year===today.getFullYear()&&month>=today.getMonth()} onClick={()=>shift(1)}>›</button></div>
   <div className="club-birthday-days">{['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=><span key={d} aria-hidden="true">{d}</span>)}{Array.from({length:first},(_,i)=><span key={`empty-${i}`}/>)}{Array.from({length:days},(_,i)=>i+1).map(day=>{const iso=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;return <button key={day} type="button" aria-label={`${months[month]} ${day}, ${year}`} aria-pressed={value===iso} disabled={new Date(year,month,day)>today||Boolean(max&&iso>max)} onClick={()=>select(day)}>{day}</button>;})}</div>
   <button type="button" className="club-birthday-done" onClick={close}>Close calendar</button>
  </section>
 </div>;
}
