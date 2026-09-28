const KEY='ohpera-pending-save';
const MAX_AGE=15*60*1000;
type StorageLike=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
let memory:{id:string;at:number}|null=null;
export function queueSave(id:string,storage:StorageLike,now=Date.now()){
 memory={id,at:now};try{storage.setItem(KEY,JSON.stringify(memory));}catch{}
}
export function cancelQueuedSave(storage:StorageLike){memory=null;try{storage.removeItem(KEY);}catch{}}
export function readQueuedSave(storage:StorageLike,now=Date.now()):string|null{
 let value:unknown=memory;try{const raw=storage.getItem(KEY);if(raw)value=JSON.parse(raw);}catch{value=null;}
 if(!value||typeof value!=='object')return null;
 const {id,at}=value as {id?:unknown;at?:unknown};
 if(typeof id!=='string'||!id||id.length>500||typeof at!=='number'||!Number.isFinite(at)||at>now||now-at>=MAX_AGE){cancelQueuedSave(storage);return null;}
 return id;
}
export function takeQueuedSave(storage:StorageLike,now=Date.now()){const id=readQueuedSave(storage,now);cancelQueuedSave(storage);return id;}
