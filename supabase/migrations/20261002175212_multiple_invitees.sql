begin;
-- Each inviter may have many people, but only one open invitation per email.
drop index club_private.club_one_pending_invitation;
create unique index club_pending_invitation_email on club_private.invitations(inviter_id,email) where revoked_at is null and accepted_at is null;
create or replace function club_private.membership_command(operation text,payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); me club_private.members; inv club_private.invitations; host club_private.members;
 token text; recipient text; result jsonb; new_member uuid; target uuid; desired text;
begin
 if uid is null then raise exception 'Sign in to continue.' using errcode='42501'; end if;
 -- Serializes commands by this user, including accepting competing invitations.
 perform 1 from auth.users where id=uid for update;
 select * into me from club_private.members where user_id=uid for update;
 if operation='me' then
  if me.id is null then return jsonb_build_object('status','not_member'); end if;
  return jsonb_build_object('id',me.id,'status',me.status,'display_name',case when me.status='active' then me.display_name else null end,'bio',case when me.status='active' then me.bio else null end);
 end if;
 if operation='accept' then
  if me.id is not null then raise exception 'You already have a membership. Returning members must contact the founders.'; end if;
  select * into inv from club_private.invitations where token_hash=encode(sha256(convert_to(coalesce(payload->>'token',''),'UTF8')),'hex');
  if inv.id is null then raise exception 'This invitation is unavailable.'; end if;
  -- All invitation mutations lock the inviter before the invitation row.
  select * into host from club_private.members where id=inv.inviter_id for update;
  select * into inv from club_private.invitations where id=inv.id for update;
  if host.status<>'active' or host.user_id is null or inv.revoked_at is not null or inv.accepted_at is not null or inv.expires_at<=now() then raise exception 'This invitation is unavailable.'; end if;
  if not exists(select 1 from auth.users where id=uid and lower(btrim(email))=inv.email and email_confirmed_at is not null) then raise exception 'Sign in with the verified email address this invitation was sent to.'; end if;
  if payload->>'adult_confirmed' is distinct from 'true' then raise exception 'Membership is for adults aged 18 and over.'; end if;
  insert into club_private.members(user_id,inviter_id,display_name,adult_confirmed_at)
   values(uid,host.id,btrim(coalesce(payload->>'display_name','')),now()) returning id into new_member;
  update club_private.invitations set accepted_at=now(),accepted_member_id=new_member where id=inv.id;
  return jsonb_build_object('id',new_member,'status','active');
 end if;
 if me.id is null or me.status<>'active' then raise exception 'An active club membership is required.' using errcode='42501'; end if;
 -- Member locks serialize slot checks with replacement invitations and status changes.
 perform 1 from club_private.members where id=me.id for update;
 if operation='connections' then
  select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'display_name',m.display_name,'bio',m.bio,'distance',v.distance) order by v.distance,m.display_name),'[]'::jsonb) into result
  from club_private.visible_connections(me.id) v join club_private.members m on m.id=v.id;
  return result;
 elsif operation='profile' then
  update club_private.members set display_name=btrim(coalesce(payload->>'display_name','')),bio=btrim(coalesce(payload->>'bio','')) where id=me.id;
  return jsonb_build_object('ok',true);
 elsif operation='invitation_list' then
  select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'email',i.email,'expires_at',i.expires_at,'status',case when i.accepted_at is not null then 'accepted' when i.revoked_at is not null then 'revoked' when i.expires_at<=now() then 'expired' else 'pending' end,
   'member',case when exists(select 1 from club_private.visible_connections(me.id) v where v.id=i.accepted_member_id) then (select jsonb_build_object('id',m.id,'display_name',m.display_name) from club_private.members m where m.id=i.accepted_member_id) else null end) order by i.created_at desc),'[]'::jsonb) into result from club_private.invitations i where i.inviter_id=me.id;
  return jsonb_build_object('history',result,'available',true);
 elsif operation='invite' then
  recipient:=lower(btrim(coalesce(payload->>'email','')));
  if length(recipient)>254 or recipient !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Enter a valid email address.'; end if;
  if exists(select 1 from auth.users where id=uid and lower(btrim(email))=recipient) then raise exception 'Choose someone other than yourself.'; end if;
  update club_private.invitations set revoked_at=now() where inviter_id=me.id and accepted_at is null and revoked_at is null and expires_at<=now();
  if exists(select 1 from club_private.invitations where inviter_id=me.id and email=recipient and accepted_at is null and revoked_at is null) then raise exception 'You already have a pending invitation for this email.'; end if;
  if exists(select 1 from club_private.members m join auth.users u on u.id=m.user_id where lower(btrim(u.email))=recipient and m.status<>'left') then raise exception 'This person is already a club member.'; end if;
  token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
  insert into club_private.invitations(inviter_id,email,token_hash) values(me.id,recipient,encode(sha256(convert_to(token,'UTF8')),'hex')) returning * into inv;
  return jsonb_build_object('token',token,'expires_at',inv.expires_at);
 elsif operation='revoke' then
  update club_private.invitations set revoked_at=now() where id=(payload->>'id')::uuid and inviter_id=me.id and accepted_at is null and revoked_at is null;
  return jsonb_build_object('ok',true);
 elsif operation='block' then
  target:=(payload->>'id')::uuid;
  if not exists(select 1 from club_private.visible_connections(me.id) where id=target) then raise exception 'Connection unavailable.'; end if;
  insert into club_private.blocks(blocker_id,blocked_id) values(me.id,target) on conflict do nothing;
  return jsonb_build_object('ok',true);
 elsif operation='unblock' then
  delete from club_private.blocks where blocker_id=me.id and blocked_id=(payload->>'id')::uuid;
  return jsonb_build_object('ok',true);
 elsif operation='blocked' then
  select coalesce(jsonb_agg(jsonb_build_object('id',blocked_id,'label','Blocked connection')),'[]'::jsonb) into result from club_private.blocks where blocker_id=me.id;
  return result;
 elsif operation='admin_status' then
  if not me.is_admin then raise exception 'Administrator access required.' using errcode='42501'; end if;
  target:=(payload->>'id')::uuid;desired:=payload->>'status';
  if target=me.id or desired not in ('active','suspended','left') or desired is null then raise exception 'Invalid membership change.'; end if;
  -- Lock the parent before the member, matching invitation acceptance order.
  perform 1 from club_private.members where id=(select inviter_id from club_private.members where id=target) for update;
  perform 1 from club_private.members where id=target for update;
  update club_private.members set status=desired where id=target;
  if not found then raise exception 'Member not found.'; end if;
  if desired<>'active' then update club_private.invitations set revoked_at=now() where inviter_id=target and accepted_at is null and revoked_at is null; end if;
  insert into club_private.audit(actor_id,subject_id,action) values(me.id,target,desired);
  return jsonb_build_object('ok',true);
 else raise exception 'Unsupported club operation.';
 end if;
end;
$$;
create or replace function club_private.manage_invitee(operation text,payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare me club_private.members; child club_private.members; result jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in to continue.' using errcode='42501'; end if;
 perform 1 from auth.users where id=auth.uid() for update;
 select * into me from club_private.members where user_id=auth.uid() for update;
 if me.id is null or me.status<>'active' then raise exception 'An active club membership is required.' using errcode='42501'; end if;
 if operation='invitation_state' then
  result:=club_private.membership_command('invitation_list','{}'::jsonb);
  select * into child from club_private.members where inviter_id=me.id and status<>'left' and user_id is not null order by created_at limit 1;
  return result||jsonb_build_object('invitees',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'display_name',display_name,'status',status) order by created_at,id),'[]'::jsonb) from club_private.members where inviter_id=me.id and status<>'left' and user_id is not null),'invitee',case when child.id is null then null else jsonb_build_object('id',child.id,'display_name',child.display_name,'status',child.status) end);
 elsif operation='remove_invitee' then
  if payload->>'confirmed' is distinct from 'true' then raise exception 'Confirm removal to continue.'; end if;
  select * into child from club_private.members where id=(payload->>'id')::uuid and inviter_id=me.id and user_id is not null for update;
  if child.id is null or child.status='left' or child.is_admin then raise exception 'You can only remove your own current invitee.' using errcode='42501'; end if;
  update club_private.members set status='left' where id=child.id;
  update club_private.invitations set revoked_at=now() where inviter_id=child.id and accepted_at is null and revoked_at is null;
  insert into club_private.audit(actor_id,subject_id,action) values(me.id,child.id,'removed_by_inviter');
  return jsonb_build_object('ok',true);
 end if;
 raise exception 'Unsupported member management operation.';
end;
$$;
commit;
