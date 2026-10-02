import {invitationWords} from './invitation-words.ts';
/** Existing invitations remain valid while new invitations use a secret word. */
export function isInvitationCode(value:string):boolean{
 return (invitationWords as readonly string[]).includes(value)||/^[a-f0-9]{64}$/.test(value)||/^(?:[bcdfghjklmnprstv][aeio][bcdfghjklmnprstv]){6}$/.test(value);
}
export function formatInvitationCode(value:string):string{
 return /^[a-f0-9]{64}$/.test(value)?value.toUpperCase().match(/.{1,8}/g)!.join('-'):value;
}
