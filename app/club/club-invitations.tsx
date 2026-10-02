'use client';
import {formatInvitationCode} from '../../lib/invitation-code';
import {useCallback,useEffect,useRef,useState} from 'react';
import {FriendProfile,type ClubApi} from './club-activity';
import MemberConversation from './member-conversation';
type Person={id:string;display_name:string;status:string};
type Invitation={id:string;email:string;expires_at:string;status:string;member:Person|null};
type InvitationState={available:boolean;history:Invitation[];invitees?:Person[];invitee?:Person|null};
type InviteResult={token:string;delivery?:'queued'|'unavailable'|'failed'};
export default function ClubInvitations({api,demo=false,focus=null}:{api:ClubApi;demo?:boolean;focus?:'invitees'|'invite'|null}){
 const [state,setState]=useState<InvitationState|null>(null),[email,setEmail]=useState(''),[codes,setCodes]=useState<Record<string,string>>({}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [remove,setRemove]=useState<Person|null>(null),[replace,setReplace]=useState<Invitation|null>(null),[action,setAction]=useState<{person:Person;kind:'profile'|'chat'}|null>(null);
 const inviteesHeading=useRef<HTMLHeadingElement>(null),newInviteHeading=useRef<HTMLHeadingElement>(null);
 const load=useCallback(async()=>{setState(await api<InvitationState>('invitation_state'));},[api]);
 useEffect(()=>{let active=true;void api<InvitationState>('invitation_state').then(s=>{if(active)setState(s);}).catch(()=>{if(active)setError('Could not load your invitations. Please try again.');});return()=>{active=false;};},[api]);
 useEffect(()=>{const target=focus==='invitees'?inviteesHeading.current:focus==='invite'?newInviteHeading.current:null;if(!target)return;target.scrollIntoView({behavior:'smooth',block:'start'});target.focus({preventScroll:true});},[focus]);
 async function act(task:()=>Promise<void>){setBusy(true);setError('');setMessage('');try{await task();}catch(e){setError(e instanceof Error?e.message:'Please try again.');}finally{setBusy(false);}}
 async function create(recipient:string){
  const result=await api<InviteResult>('invite',{email:recipient});
  setCodes(c=>{const next={...c};if(!demo&&result.delivery==='queued'){delete next[recipient];}else{next[recipient]=formatInvitationCode(result.token);}return next;});setEmail('');await load();
  setMessage(demo?'Demo invitation created. No email was sent.':result.delivery==='queued'?`Invitation sent to ${recipient}. They’ll receive their secret word by email.` : result.delivery==='failed'?'Invitation created, but email delivery could not be confirmed. Share its secret word below if it does not arrive.':'Invitation created. Email is not configured; share its secret word below.');
 }
 const people=state?.invitees??(state?.invitee?[state.invitee]:[]);
 const pending=state?.history.filter(i=>i.status==='pending')??[];
 return <div className="club-invitation-manager">
  <p>Invite people you know into your opera circle. Each person receives their own secret word and can invite others too.</p>
  {error&&<div role="alert"><p>{error}</p><button disabled={busy} onClick={()=>void act(load)}>Refresh invitations</button></div>}
  {message&&<p role="status">{message}</p>}{!state&&!error&&<p role="status">Loading your invitations…</p>}
  <div className="club-member-management-grid">
   <section className="club-member-management-panel" aria-labelledby="my-invitees-heading"><h2 id="my-invitees-heading" ref={inviteesHeading} tabIndex={-1}>My invitees</h2>
    {state&&!people.length&&!pending.length&&<p>You have no current invitees or pending invitations.</p>}
    <ul className="club-invitee-list">
     {people.map(person=><li className="club-invitation-current" key={person.id}><div className="club-invitee-row"><div><h3>{person.display_name}</h3><p>{person.status==='active'?'Joined the club':'Membership paused'}</p></div><details className="club-member-options"><summary>Options for {person.display_name}</summary><div><button onClick={()=>setAction({person,kind:'profile'})}>View profile</button><button onClick={()=>setAction({person,kind:'chat'})}>Start a chat</button><button disabled={busy} onClick={()=>setRemove(person)}>Remove member</button></div></details></div>
      {remove?.id===person.id&&<div className="club-remove-confirmation"><p>Remove {person.display_name}? They will lose club access and their pending invitations will be cancelled. Their joined invitees keep their memberships.</p><div className="club-actions"><button disabled={busy} onClick={()=>void act(async()=>{await api('remove_invitee',{id:person.id,confirmed:true});setRemove(null);await load();setMessage('Member removed.');})}>Confirm removal</button><button disabled={busy} onClick={()=>setRemove(null)}>Keep member</button></div></div>}
     </li>)}
     {pending.map(invitation=><li className="club-invitation-current" key={invitation.id}><div className="club-invitee-row"><div><h3>{invitation.email}</h3><p>Awaiting acceptance</p><p className="club-fine-print">Expires {new Date(invitation.expires_at).toLocaleDateString()}</p></div><details className="club-member-options"><summary>Options for {invitation.email}</summary><div><button disabled={busy} onClick={()=>setReplace(invitation)}>Replace secret word</button><button disabled={busy} onClick={()=>void act(async()=>{await api('revoke',{id:invitation.id});setCodes(c=>{const next={...c};delete next[invitation.email];return next;});await load();setMessage(`Invitation for ${invitation.email} cancelled.`);})}>Cancel invitation</button></div></details></div>
      {codes[invitation.email]&&<div className="club-invitation-share"><label>Secret word for {invitation.email}<input readOnly value={codes[invitation.email]} onFocus={e=>e.target.select()}/></label><button disabled={busy} onClick={()=>void act(async()=>{await navigator.clipboard.writeText(codes[invitation.email]);setMessage('Secret word copied.');})}>Copy secret word</button></div>}
      {replace?.id===invitation.id&&<div className="club-remove-confirmation"><p>Replace the secret word for {invitation.email}? Their old secret word will stop working. Other invitations stay active.</p><div className="club-actions"><button disabled={busy} onClick={()=>void act(async()=>{await api('revoke',{id:invitation.id});setReplace(null);setEmail(invitation.email);await load();await create(invitation.email);})}>Replace secret word</button><button disabled={busy} onClick={()=>setReplace(null)}>Keep existing secret word</button></div></div>}
     </li>)}
    </ul>
   </section>
   <section className="club-member-management-panel" aria-labelledby="new-invite-heading"><h2 id="new-invite-heading" ref={newInviteHeading} tabIndex={-1}>Invite a new member</h2><form onSubmit={e=>{e.preventDefault();void act(()=>create(email.trim().toLowerCase()));}}><label>Invitee’s email<input disabled={!state||busy} type="email" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={254} autoComplete="off" placeholder="friend@example.com"/></label><p className="club-fine-print">{demo?'Preview invitations do not send email.':'We’ll email their secret word.'} Only the invited email can accept. Secret words expire in seven days.</p><button className="club-primary" disabled={busy||!state}>{busy?'Sending invitation…':demo?'Create demo invitation':'Send invitation'}</button></form></section>
  </div>
  {action?.kind==='profile'&&<FriendProfile person={{...action.person,relationship:'Your invitee'}} api={api} onClose={()=>setAction(null)} onMessage={()=>setAction({...action,kind:'chat'})}/>} 
  {action?.kind==='chat'&&<MemberConversation person={action.person} api={api} onClose={()=>setAction(null)}/>} 
 </div>;
}
