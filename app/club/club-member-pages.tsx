"use client";
import ClubActivity, {type ActivityView, type ClubApi} from './club-activity';
import ClubProfile from './club-profile';
import ClubInvitations from './club-invitations';
export type MemberView = ActivityView | 'members' | 'profile';
/** Shared member screens: the API adapter supplies live or fictional data. */
export default function ClubMemberPages({view,api,membersSection,onView,onPlansCount,onProfileSaved,demo=false}:{view:MemberView;api:ClubApi;membersSection?:'invitees'|'invite'|null;onView:(view:ActivityView)=>void;onPlansCount:(count:number)=>void;onProfileSaved?:()=>void;demo?:boolean}){
 if(view==='profile')return <ClubProfile api={api} demo={demo} onSaved={onProfileSaved}/>;
 if(view==='members')return <section className="club-members-page"><header className="club-calendar-welcome"><p className="club-kicker">Your private opera circle · New York</p><h1>{membersSection==='invitees'?'My invitees':membersSection==='invite'?'Invite a new member':'Members'}</h1>{!membersSection&&<p>View your invitees or invite someone new.</p>}</header><ClubInvitations api={api} focus={membersSection}/></section>;
 return <>{view==='messages'&&<div className="club-demo-heading"><p className="club-kicker">Your private opera circle</p><h1>Make a plan together.</h1></div>}<ClubActivity api={api} view={view} onView={onView} onPlansCount={onPlansCount}/></>;
}
