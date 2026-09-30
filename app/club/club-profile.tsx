'use client';
/* eslint-disable @next/next/no-img-element -- Member photos are bounded, locally resized JPEG data URLs. */
import {useEffect,useRef,useState} from 'react';
import ClubFilterSelect from './club-filter-select';
import type {ClubApi} from './club-activity';
export const meetingInterests=[['dinner','Dinner before the opera'],['drinks','Drinks together'],['discussion','Opera discussion'],['dating','Open to dating'],['champagne','Champagne & chit-chat'],['friendship','Making friends']] as const;
export type ClubProfileData={id:string;display_name:string;first_name:string;last_name:string;email?:string;date_of_birth?:string|null;gender?:string;gender_description?:string;bio:string;interests:string[];photos:string[]};
async function preparePhoto(file:File):Promise<string>{
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Choose a JPEG, PNG or WebP photo.');
 if(file.size>8*1024*1024)throw Error('Choose a photo smaller than 8 MB.');
 const bitmap=await createImageBitmap(file);
 try{
  if(!bitmap.width||!bitmap.height||bitmap.width*bitmap.height>40000000)throw Error('This photo is too large. Choose a smaller image.');
  const scale=Math.min(1,480/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
  const context=canvas.getContext('2d');if(!context)throw Error('Could not prepare your photo.');
  context.fillStyle='#fffdf9';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);
  for(const quality of [.82,.65,.45]){const data=canvas.toDataURL('image/jpeg',quality);if(data.length<=90000)return data;}
  throw Error('Choose a simpler or smaller photo.');
 }finally{bitmap.close();}
}
export default function ClubProfile({api,demo=false,onSaved}:{api:ClubApi;demo?:boolean;onSaved?:()=>void}){
 const [profile,setProfile]=useState<ClubProfileData|null>(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[uploading,setUploading]=useState(false),[dirty,setDirty]=useState(false);
 const upload=useRef<HTMLInputElement>(null),alive=useRef(true);
 useEffect(()=>{alive.current=true;let current=true;void api<ClubProfileData>('profile_get').then(data=>{if(current)setProfile(data);}).catch(e=>{if(current)setError(e instanceof Error?e.message:'Could not load your profile.');});return()=>{current=false;alive.current=false;};},[api]);
 useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 function edit(patch:Partial<ClubProfileData>){setProfile(previous=>previous?{...previous,...patch}:previous);setDirty(true);setMessage('');}
 async function addPhotos(files:FileList|null){
  if(!files||!profile)return;setError('');if(profile.photos.length+files.length>3){setError('You can add up to three photos. Remove one before adding another.');return;}
  setUploading(true);try{const photos=[];for(const file of Array.from(files))photos.push(await preparePhoto(file));if(alive.current)edit({photos:[...new Set([...profile.photos,...photos])]});}catch(e){if(alive.current)setError(e instanceof Error?e.message:'Could not read this photo.');}finally{if(alive.current){setUploading(false);if(upload.current)upload.current.value='';}}
 }
 if(!profile)return <section className="club-profile-editor"><p role={error?'alert':'status'}>{error||'Loading your profile…'}</p></section>;
 const today=new Date(),latest=new Date(today.getFullYear()-18,today.getMonth(),today.getDate());
 const maxDob=`${latest.getFullYear()}-${String(latest.getMonth()+1).padStart(2,'0')}-${String(latest.getDate()).padStart(2,'0')}`;
 return <section className="club-profile-editor" aria-labelledby="edit-profile-title"><header className="club-calendar-welcome"><p className="club-kicker">Your private opera circle</p><h1 id="edit-profile-title">My profile</h1><p>A little about you. A starting point for a shared evening.</p></header>
 {demo&&<p className="club-profile-demo-note">Tester profile: use fictional details. Changes last until this local preview restarts.</p>}
 <form onSubmit={event=>{event.preventDefault();setError('');setMessage('');setBusy(true);const {first_name,last_name,gender,gender_description,bio,interests,photos}=profile;const date_of_birth=String(new FormData(event.currentTarget).get('date_of_birth')||'');void api('profile_save',{first_name,last_name,date_of_birth,gender,gender_description,bio,interests,photos}).then(()=>{if(alive.current){setDirty(false);setMessage('Profile saved. Your circle can see your updated profile.');onSaved?.();}}).catch(e=>{if(alive.current)setError(e instanceof Error?e.message:'Could not save your profile.');}).finally(()=>{if(alive.current)setBusy(false);});}}>
 <fieldset disabled={busy||uploading} className="club-profile-fields"><legend className="sr-only">Your profile details</legend>
 <div className="club-profile-grid"><section className="club-profile-panel"><h2>Your details</h2><div className="club-profile-name-row"><label>First name<input value={profile.first_name} onChange={e=>edit({first_name:e.target.value})} maxLength={50} autoComplete="given-name" required/></label><label>Last name<input value={profile.last_name} onChange={e=>edit({last_name:e.target.value})} maxLength={50} autoComplete="family-name" required/></label></div>
 <label>Email address <span className="club-private-label">Private</span><input type="email" value={profile.email||''} readOnly autoComplete="email" aria-describedby="profile-email-note"/></label><p id="profile-email-note" className="club-fine-print">Your account email, supplied when you register. It is never shown to other members.</p>
 <label>Date of birth <span className="club-private-label">Private</span><input type="date" name="date_of_birth" defaultValue={profile.date_of_birth||''} onChange={e=>edit({date_of_birth:e.target.value})} max={maxDob} autoComplete="bday" required/></label><p className="club-fine-print">For adult membership eligibility. Your birthday and age are not shown to your circle.</p>
 <ClubFilterSelect label="Gender · Optional · Private" value={profile.gender||''} onChange={value=>edit({gender:value,gender_description:''})} options={[{value:'',label:'Select if you’d like',placeholder:true},{value:'woman',label:'Woman'},{value:'man',label:'Man'},{value:'nonbinary',label:'Non-binary'},{value:'self_describe',label:'Self-describe'},{value:'prefer_not_to_say',label:'Prefer not to say'}]}/>{profile.gender==='self_describe'&&<label>How do you describe your gender?<input value={profile.gender_description||''} maxLength={60} onChange={e=>edit({gender_description:e.target.value})}/></label>}
 </section><section className="club-profile-panel"><h2>Your photos</h2><p>Add up to three photos. The first is your profile picture.</p><div className="club-profile-photos">{profile.photos.map((photo,index)=><div className="club-profile-photo" key={photo}><img src={photo} alt={`Your photo ${index+1}`} width={180} height={180}/><span>{index===0?'Profile photo':`Photo ${index+1}`}</span><div>{index>0&&<button type="button" onClick={()=>edit({photos:[photo,...profile.photos.filter((_,i)=>i!==index)]})} aria-label={`Make photo ${index+1} your profile photo`}>Make main</button>}<button type="button" onClick={()=>edit({photos:profile.photos.filter((_,i)=>i!==index)})} aria-label={`Remove photo ${index+1}`}>Remove</button></div></div>)}{profile.photos.length===0&&<div className="club-profile-photo-placeholder" aria-hidden="true">{profile.first_name.charAt(0)||'?'}</div>}</div>
 <label className="club-photo-upload">{uploading?'Preparing photos…':'Upload photos'}<input ref={upload} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={profile.photos.length>=3||busy||uploading} onChange={e=>void addPhotos(e.target.files)}/></label><p className="club-fine-print">JPEG, PNG or WebP, up to 8 MB each. Photos are resized before saving and shared only with your allowed connections.</p>
 <label>A little about you <span className="club-private-label">Optional</span><textarea value={profile.bio} onChange={e=>edit({bio:e.target.value})} maxLength={300} rows={4} placeholder="Your favorite opera, a conversation starter, or what makes a great evening…"/></label><p className="club-fine-print">{profile.bio.length}/300</p></section></div>
 <section className="club-profile-panel club-profile-interests"><h2>What brings you to the opera?</h2><p>Choose as many as you like. These interests are visible to your circle and can change anytime.</p><div className="club-interest-choices">{meetingInterests.map(([value,label])=><label key={value} className={profile.interests.includes(value)?'is-selected':''}><input type="checkbox" checked={profile.interests.includes(value)} onChange={e=>edit({interests:e.target.checked?[...profile.interests,value]:profile.interests.filter(i=>i!==value)})}/><span>{label}</span></label>)}</div><p className="club-fine-print">Choosing dating expresses an interest, not an expectation of another member.</p></section>
 </fieldset><div className="club-profile-save"><button className="club-primary" disabled={busy||uploading}>{busy?'Saving…':'Save profile'}</button><span>{dirty?'Unsaved changes':''}</span></div>{error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
 </form></section>;
}
