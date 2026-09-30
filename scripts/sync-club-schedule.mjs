// Explicit operator command: requires privileged server-only credentials.
import {createClient} from '@supabase/supabase-js';
import {readFile} from 'node:fs/promises';
import {validSchedule} from '../lib/security.ts';
import {mergeCurated} from '../lib/curated.ts';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw Error('Set the intended Supabase project URL and server-only SUPABASE_SERVICE_ROLE_KEY before syncing.');
const schedule=JSON.parse(await readFile(new URL('../data/schedule.json',import.meta.url),'utf8'));
if(!validSchedule(schedule))throw Error('Invalid bundled schedule.');
const curated=JSON.parse(await readFile(new URL('../data/curated.json',import.meta.url),'utf8'));
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const items=mergeCurated(schedule.performances,curated,today);
const {error}=await client.rpc('club_sync_schedule',{items});
if(error)throw Error('Schedule sync failed. Verify the project and migrations.');
console.log(`Synced ${items.length} performances. Changed dates, times and venues require attendance reconfirmation.`);
