import type {ClubApi} from '../app/club/club-activity';
import type {ClubProfileData} from '../app/club/club-profile';

type Invite={id:string;email:string;token:string;expires_at:string;status:string;member:null};
type Message={id:string;mine:boolean;body:string;created_at:string};
/** An isolated in-memory adapter. No network, credentials, storage or real member data. */
export function createDemoApi(now=new Date()):ClubApi {
 let serial=10;
 const people:Record<string,ClubProfileData>={};
 for(const [id,name,interests] of [['maya','Maya',['dinner','discussion']],['sofia','Sofia',['discussion']],['lina','Lina',['drinks','friendship']]] as const){
  people[id]={id,username:name+'Demo',display_name:name+' Demo',first_name:name,last_name:'Demo',email:id+'@example.com',date_of_birth:'1994-05-12',gender:'prefer_not_to_say',bio:'A fictional opera lover. Let’s meet before the performance!',interests:[...interests],photos:[]};
 }
 const dates=[2,5,8].map(days=>{const date=new Date(now);date.setDate(date.getDate()+days);return date.toISOString().slice(0,10);});
 const shows=[['macbeth','Macbeth','Giuseppe Verdi'],['la-boheme','La Bohème','Giacomo Puccini'],['cosi-fan-tutte','Così fan tutte','Wolfgang Amadeus Mozart']].map(([id,title,composer],index)=>({id,title,composer,date:dates[index],time:'19:30:00',company:'Demo Opera Company',venue:'Example Opera House',status:'scheduled',kind:'opera',description:'Illustrative performance for the OH-pera demo. Dates and attendance are fictional.'}));
 const going=new Set<string>();
 const invites:Invite[]=[];
 const invitees=new Set(['lina']);
 const removed=new Set<string>();
 const messages:Record<string,Message[]>={sofia:[{id:'1',mine:false,body:'Demo message: Would you like to meet for dinner before the opera?',created_at:now.toISOString()}],lina:[]};
 const unread:Record<string,number>={sofia:1,lina:0};
 const contact=(id:string)=>({id,display_name:people[id].display_name,relationship:id==='sofia'?'Your inviter':'Your invitee',status:'active',can_message:true,unread:unread[id]||0});
 function person(id:string){if(!people[id]||removed.has(id))throw Error('This demo member is unavailable.');return people[id];}
 function run(operation:string,payload:Record<string,unknown>){
  const id=String(payload.id||'');
  switch(operation){
   case 'calendar':case 'plans': return shows.filter(show=>operation==='calendar'||going.has(show.id)).map(performance=>{const friends=Object.keys(people).filter(key=>key!=='maya'&&!removed.has(key));return {performance,revision:1,mine:going.has(performance.id)?'going':null,total:friends.length+Number(going.has(performance.id)),people:friends.map(contact)};});
   case 'attend':case 'withdraw':if(!shows.some(show=>show.id===id))throw Error('Choose a demo performance.');if(operation==='attend')going.add(id);else going.delete(id);return {ok:true};
   case 'profile_get':return people.maya;
   case 'profile_view':{const {first_name,last_name,email,date_of_birth,gender,gender_description,...visible}=person(id);void first_name;void last_name;void email;void date_of_birth;void gender;void gender_description;return {...visible,first_name:'',last_name:''};}
   case 'profile_save':{
    const username=String(payload.username||'');if(!/^[A-Za-z0-9]{6,30}$/.test(username))throw Error('Use 6–30 letters or numbers for your demo username.');
    people.maya={...people.maya,username,display_name:username,first_name:String(payload.first_name||''),last_name:String(payload.last_name||''),date_of_birth:String(payload.date_of_birth||''),gender:String(payload.gender||''),gender_description:String(payload.gender_description||''),bio:String(payload.bio||'').slice(0,300),interests:Array.isArray(payload.interests)?payload.interests.filter((x):x is string=>typeof x==='string'):[],photos:Array.isArray(payload.photos)?payload.photos.filter((x):x is string=>typeof x==='string'&&x.startsWith('data:image/jpeg;')).slice(0,3):[]};return {ok:true};
   }
   case 'inbox':case 'connections':return Object.keys(people).filter(key=>key!=='maya'&&!removed.has(key)).map(contact);
   case 'thread':person(id);return {messages:(messages[id]||[]).filter(m=>!payload.before||BigInt(m.id)<BigInt(String(payload.before))),can_message:true};
   case 'send':{
    person(id);const body=String(payload.body||'').trim();if(!body||body.length>2000)throw Error('Write a message of up to 2,000 characters.');
    messages[id]??=[];messages[id].push({id:String(++serial),mine:true,body,created_at:new Date().toISOString()},{id:String(++serial),mine:false,body:'Demo reply: That sounds lovely! Let’s meet in the lobby 30 minutes before the show. (This is an automatic fictional reply.)',created_at:new Date().toISOString()});unread[id]=(unread[id]||0)+1;return {ok:true};
   }
   case 'mark_read':person(id);unread[id]=0;return {ok:true};
   case 'invitation_state':return {available:true,history:invites,invitees:[...invitees].filter(key=>!removed.has(key)).map(contact)};
   case 'invite':{
    const email=String(payload.email||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Enter a demo email address.');
    if(invites.some(i=>i.email===email&&i.status==='pending'))throw Error('This demo address already has a pending invitation.');
    const words=['overture','harmony','crescendo','sonata'];const token=words[invites.length%words.length];
    invites.push({id:String(++serial),email,token,expires_at:new Date(now.getTime()+7*86400000).toISOString(),status:'pending',member:null});return {token,delivery:'unavailable'};
   }
   case 'revoke':{const invitation=invites.find(i=>i.id===id);if(!invitation)throw Error('Invitation not found.');invitation.status='revoked';return {ok:true};}
   case 'demo_accept':{
    const invitation=invites.find(i=>i.id===id&&i.status==='pending');if(!invitation)throw Error('Create a demo invitation first.');
    invitation.status='accepted';const key='guest'+(++serial);people[key]={...people.lina,id:key,username:'Guest'+serial,display_name:'Guest Demo '+serial,email:invitation.email,first_name:'Guest',photos:[]};invitees.add(key);messages[key]=[];return {ok:true};
   }
   case 'remove_invitee':if(!invitees.has(id))throw Error('Choose your demo invitee.');removed.add(id);return {ok:true};
   default:throw Error('This action is not part of the demo.');
  }
 }
 return async<T,>(operation:string,payload:Record<string,unknown>={})=>structuredClone(run(operation,payload)) as T;
}
