import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
export const memberId=n=>`10000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
export async function createClubFixture({schedule}={}){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb not null default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;create schema storage;create table storage.buckets(id text primary key,name text not null,public boolean not null default false);create table storage.objects(bucket_id text not null,name text not null,primary key(bucket_id,name));create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;`);
 for(const name of ['20260929130209_private_club_membership.sql','20260929132042_club_attendance_messages.sql','20260930141454_manage_direct_invitee.sql','20260930150000_preserve_inviter_only_removal.sql','20260930160000_member_account_profiles.sql','20260930160509_member_profiles.sql'])await db.exec(readFileSync(new URL(`../../supabase/migrations/${name}`,import.meta.url),'utf8'));
 const names=['Sofia','Maya','Ahmet','Lina','Noah','Elena'];
 for(let n=1;n<=6;n++){
  await db.query('insert into auth.users values($1,$2,now(),$3::jsonb)',[memberId(n),`demo${n}@example.test`,JSON.stringify({username:`member_${n}`,first_name:names[n-1],last_name:'Example',date_of_birth:'1990-01-01'})]);
  await db.query(`insert into club_private.members(id,user_id,inviter_id,is_admin,display_name,bio,adult_confirmed_at) values($1,$1,$2,$3,$4,'A fictional member for the local preview.',now())`,[memberId(n),n===1||n===6?null:memberId(n-1),n===1||n===6,names[n-1]]);
 }
 let queue=Promise.resolve();
 function as(n,operation,payload={}){
  const task=queue.then(async()=>{
   await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[n?memberId(n):'']);await db.exec(`set role ${n?'authenticated':'anon'}`);
   try{return (await db.query('select public.club_command($1,$2::jsonb) result',[operation,JSON.stringify(payload)])).rows[0].result;}finally{await db.exec('reset role');}
  });queue=task.catch(()=>{});return task;
 }
 const day=offset=>{const date=new Date();date.setUTCDate(date.getUTCDate()+offset);return date.toISOString().slice(0,10);};
 const performances=schedule||[
  {id:'demo-macbeth',title:'Macbeth',composer:'Giuseppe Verdi',company:'Metropolitan Opera',venue:'Metropolitan Opera House',date:day(2),time:'19:30',status:'scheduled'},
  {id:'demo-boheme',title:'La Bohème',composer:'Giacomo Puccini',company:'Metropolitan Opera',venue:'Metropolitan Opera House',date:day(5),time:'19:00',status:'scheduled'},
  {id:'demo-carmen',title:'Carmen',composer:'Georges Bizet',company:'Opera in New York',venue:'Venue to be confirmed',date:day(10),time:'19:30',status:'scheduled'}
 ];
 await db.query('select club_private.sync_schedule($1::jsonb)',[JSON.stringify(performances)]);
 const first=performances.find(p=>p.status==='scheduled');
 if(first)for(const n of [1,3,4,5,6])await as(n,'attend',{id:first.id,revision:1});
 await as(3,'send',{id:memberId(2),body:first?`I’m going to ${first.title}. Shall we arrange a place to meet before the performance?`:'Shall we plan an evening at the opera?' });
 return {db,as,performances,names};
}
