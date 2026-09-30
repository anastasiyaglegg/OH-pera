// Separate loopback-only development server. Never imported by production routes.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {mergeCurated} from '../lib/curated.ts';
import {validSchedule} from '../lib/security.ts';
import {nycToday} from './lib/core.mjs';
import {createClubFixture} from '../tests/support/club-db.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const schedule=JSON.parse(await readFile(resolve(root,'data/schedule.json'),'utf8'));
if(!validSchedule(schedule))throw Error('Invalid schedule.');
const curated=JSON.parse(await readFile(resolve(root,'data/curated.json'),'utf8'));
const performances=mergeCurated(schedule.performances,curated,nycToday()).map(p=>({...p,title:p.title.replace(/ \([^()]+\)$/,''),composer:p.composer||p.title.match(/\(([^()]+)\)$/)?.[1]||null}));
const {as}=await createClubFixture({schedule:performances});
// Fictional profile interests make the local circle badges reviewable.
for(const [member,first_name,interests] of [
 [1,'Sofia',['discussion']], [2,'Maya',['dinner','champagne']],
 [3,'Ahmet',['dinner']], [4,'Lina',['champagne']],
 [5,'Noah',['drinks','friendship']], [6,'Elena',['discussion']]
])await as(member,'profile_save',{first_name,last_name:'Demo',date_of_birth:'1994-05-12',gender:'prefer_not_to_say',gender_description:'',bio:'A fictional member for the local preview.',interests,photos:[]});

// Enrich only the local demo; never mark the preview viewer as attending.
const demoCalendar=await as(2,'calendar');
const demoEvenings=demoCalendar.filter(row=>row.performance.status==='scheduled');
const featured=new Map(demoEvenings.slice(0,18).map(row=>[row.performance.id,row]));
const months=new Set();
for(const row of demoEvenings){
 const month=row.performance.date.slice(0,7);
 if(!months.has(month)){featured.set(row.performance.id,row);months.add(month);}
}
const friendGroups=[[1,3],[3,4],[1,4,5],[1,3,4,6],[4],[1,3,5,6]];
for(const [index,row] of [...featured.values()].entries()){
 for(const friend of friendGroups[index%friendGroups.length])await as(friend,'attend',{id:row.performance.id,revision:row.revision});
}

const bundle=await build({entryPoints:[resolve(root,'dev/club-preview.tsx')],bundle:true,write:false,format:'esm',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'}});
const js=bundle.outputFiles[0].contents;
const previewCssPrefix=':root{--font-display:Georgia;--font-geist-sans:Arial}.club-original-hero img.club-static-hero-image{position:absolute;inset:0;width:100%;height:100%}';
const allowed=new Set(['calendar','plans','attend','withdraw','inbox','thread','send','mark_read','connections','block','unblock','invitation_list','invite','revoke','invitation_state','remove_invitee','profile_get','profile_save','profile_view']);
const origins=new Set(['http://localhost:3002','http://127.0.0.1:3002']);
const server=createServer(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'");
 function send(status,type,body){res.writeHead(status,{'Content-Type':type});res.end(body);}
 if(!['localhost:3002','127.0.0.1:3002'].includes(req.headers.host)){send(403,'text/plain','Local preview only');return;}
 try{
  if(req.method==='POST'&&req.url==='/rpc'){
   if(!origins.has(req.headers.origin)){send(403,'application/json',JSON.stringify({error:'Local origin required'}));return;}
   let body='';for await(const chunk of req){body+=chunk;if(body.length>400000){send(413,'application/json','{"error":"Request too large"}');return;}}
   const {member,operation,payload}=JSON.parse(body);
   if(!Number.isInteger(member)||member<1||member>6||!allowed.has(operation)){send(400,'application/json','{"error":"Invalid demo request"}');return;}
   try{send(200,'application/json',JSON.stringify(await as(member,operation,payload||{})));}catch(e){send(400,'application/json',JSON.stringify({error:e.message}));}return;
  }
  if(req.method!=='GET'){send(405,'text/plain','Method not allowed');return;}
  if(req.url==='/'){send(200,'text/html','<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>OH-pera Club · Local Demo</title><link rel="stylesheet" href="/club.css"></head><body><div id="root"></div><script type="module" src="/club.js"></script></body></html>');return;}
  if(req.url==='/coverage.json'){send(200,'application/json',JSON.stringify({sources:schedule.sources.map(({id,name,url})=>({id,name,url})),generatedAt:schedule.generatedAt}));return;}
  if(req.url==='/club.js'){send(200,'text/javascript',js);return;}
  if(req.url==='/club.css'){send(200,'text/css',previewCssPrefix+(await readFile(resolve(root,'app/globals.css'),'utf8')).replace("@import 'tailwindcss';",''));return;}
  if(req.url&&/^\/images\/(operas|venues)\/[a-z0-9-]+\.(jpg|png)$/.test(req.url)){send(200,req.url.endsWith('.png')?'image/png':'image/jpeg',await readFile(resolve(root,'public'+req.url)));return;}
  if(req.url==='/images/oh-pera-singer-logo.png'){send(200,'image/png',await readFile(resolve(root,'public/images/oh-pera-singer-logo.png')));return;}
  send(404,'text/plain','Not found');
 }catch{send(500,'text/plain','Preview error');}
});
server.listen(3002,'127.0.0.1',()=>console.log('OH-pera local demo: http://localhost:3002 — fictional data only; no Supabase credentials needed.'));
