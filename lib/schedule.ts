export type Performance = {
 id:string;sourceId:string;title:string;company:string;composer:string|null;venue:string|null;
 borough:string;neighborhood:string|null;date:string;time:string|null;description:string|null;
 runtime:string|null;language:string|null;ticketUrl:string|null;sourceUrl:string;palette:string;label:string;
 kind:'opera'|'concert'|'screening';status:'scheduled'|'cancelled'|'unconfirmed';checkedAt:string;
 provenanceUrl?:string;verification?:'secondary'|'manual';reviewedBy?:string;reviewBy?:string;evidenceNote?:string;evidenceMethod?:'indexed-official';
};
export type Source = {id:string;name:string;url:string;lastAttemptAt:string|null;lastSuccessAt:string|null;status:'live'|'partial'|'fallback'|'error';message:string|null};
export type Announcement = {id:string;sourceId:string;company:string;title:string;dateText:string;sourceUrl:string;checkedAt:string;note:string};
export type Schedule = {schemaVersion:number;generatedAt:string;performances:Performance[];sources:Source[];announcements:Announcement[];delivery?:'latest'|'bundled';coverage:string};
export function nycDate(now=new Date()):string {return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function isStale(date:string|null,now=Date.now()):boolean {return !date||!Number.isFinite(Date.parse(date))||now-Date.parse(date)>48*60*60*1000;}
export function formatTime(time:string|null):string {if(!time)return 'Time not confirmed';const [h,m]=time.split(':').map(Number);return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'} ET`;}
