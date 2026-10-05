"use client";
import {useEffect} from 'react';
import ClubActivity, {type ActivityView, type ClubApi} from './club-activity';
import ClubProfile from './club-profile';
import ClubInvitations from './club-invitations';
export type MemberView = ActivityView | 'members' | 'profile';
/** Shared member screens: the API adapter supplies live or fictional data. */
export default function ClubMemberPages({view,api,onView,onPlansCount,onProfileSaved,demo=false}:{view:MemberView;api:ClubApi;onView:(view:ActivityView)=>void;onPlansCount:(count:number)=>void;onProfileSaved?:()=>void;demo?:boolean}){
 useEffect(()=>{window.scrollTo({top:0,behavior:'instant'});},[view]);
 if(view==='profile')return <ClubProfile api={api} demo={demo} onSaved={onProfileSaved}/>;
 if(view==='members')return <section className="club-members-page"><header className="club-calendar-welcome"><p className="club-kicker">Your private opera circle · New York</p><h1>Invite members</h1><p>Invite friends to your opera circle and manage your invitations here.</p></header><ClubInvitations api={api} demo={demo}/></section>;
 return <><ClubActivity api={api} view={view} onView={onView} onPlansCount={onPlansCount}/></>;
}
