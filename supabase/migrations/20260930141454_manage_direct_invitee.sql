begin;
-- Direct-invitee management preserves the invitation graph and all descendants.
create function club_private.manage_invitee(operation text,payload jsonb)
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
  return result||jsonb_build_object('invitee',case when child.id is null then null else jsonb_build_object('id',child.id,'display_name',child.display_name,'status',child.status) end);
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
revoke all on function club_private.manage_invitee(text,jsonb) from public,anon;
grant execute on function club_private.manage_invitee(text,jsonb) to authenticated;
create or replace function public.club_command(operation text,payload jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path='' as $$
 select case when operation in ('invitation_state','remove_invitee') then club_private.manage_invitee(operation,payload) else club_private.command(operation,payload) end;
$$;
revoke all on function public.club_command(text,jsonb) from public,anon;
grant execute on function public.club_command(text,jsonb) to authenticated;
commit;
