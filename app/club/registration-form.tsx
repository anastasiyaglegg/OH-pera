'use client';
import {useRef,useState,type FormEvent} from 'react';
import BirthDatePicker from './birth-date-picker';
export default function RegistrationForm({busy,onSubmit}:{busy:boolean;onSubmit:(event:FormEvent<HTMLFormElement>)=>void}){
 const [step,setStep]=useState(0);
 const account=useRef<HTMLFieldSetElement>(null),details=useRef<HTMLFieldSetElement>(null);
 function valid(section:HTMLFieldSetElement|null){
  for(const input of Array.from(section?.querySelectorAll<HTMLInputElement>('input')||[]))if(!input.reportValidity())return false;
  return true;
 }
 function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(step===0){
   const password=event.currentTarget.elements.namedItem('password') as HTMLInputElement;
   const confirm=event.currentTarget.elements.namedItem('verifyPassword') as HTMLInputElement;
   confirm.setCustomValidity(password.value===confirm.value?'':'Passwords do not match.');
   if(valid(account.current)){setStep(1);requestAnimationFrame(()=>details.current?.querySelector<HTMLInputElement>('input')?.focus());}
  }else if(valid(details.current)){onSubmit(event);}
 }
 return <form className="club-registration-form" noValidate onSubmit={submit}>
  <p className="club-form-progress" aria-live="polite">Step {step+1} of 2 · {step===0?'Account':'Personal details'}</p>
  <fieldset ref={account} hidden={step!==0} disabled={busy} className="club-registration-step">
   <legend className="sr-only">Account</legend>
   <label>Email<input name="email" type="email" required autoComplete="email"/></label>
   <label>Password<input name="password" type="password" required minLength={8} autoComplete="new-password"/></label>
   <label>Confirm password<input name="verifyPassword" type="password" required minLength={8} autoComplete="new-password" onChange={e=>e.target.setCustomValidity('')}/></label>
  </fieldset>
  <fieldset ref={details} hidden={step!==1} disabled={busy} className="club-registration-step">
   <legend className="sr-only">Personal details</legend>
   <label>Username<input name="username" maxLength={30} required autoComplete="username" pattern="[A-Za-z0-9]{6,30}" title="Use 6 to 30 letters or numbers."/></label>
   <div className="club-form-pair"><label>First name<input name="firstName" maxLength={80} required autoComplete="given-name"/></label><label>Last name<input name="lastName" maxLength={80} required autoComplete="family-name"/></label></div>
   <BirthDatePicker/>
   <p className="club-fine-print">Your birthday is private. Add optional details to your profile later.</p>
  </fieldset>
  <div className="club-form-actions">{step===1&&<button type="button" disabled={busy} onClick={()=>setStep(0)}>Back</button>}<button className="club-primary" disabled={busy} type="submit">{busy?'Creating account…':step===0?'Continue':'Create account'}</button></div>
 </form>;
}
