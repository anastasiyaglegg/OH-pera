begin;

create function club_private.current_active_member_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id
  from club_private.members m
  where m.user_id = auth.uid() and m.status = 'active'
$$;

create function club_private.current_member_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from club_private.members m
    where m.user_id = auth.uid() and m.status = 'active' and m.role = 'admin'
  )
$$;

create function club_private.are_direct_connections(first_member uuid, second_member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from club_private.members first_record
    join club_private.members second_record on second_record.user_id = second_member
    where first_record.user_id = first_member
      and first_record.status = 'active'
      and second_record.status = 'active'
      and (first_record.inviter_id = second_member or second_record.inviter_id = first_member)
  )
$$;

create function public.club_remove_invited_member(requested_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_member uuid := club_private.current_active_member_id();
  invited_member club_private.members%rowtype;
begin
  if active_member is null then
    raise exception 'Active club membership is required';
  end if;
  if requested_member_id = active_member then
    raise exception 'Members cannot remove themselves with this action';
  end if;

  select * into invited_member
  from club_private.members
  where user_id = requested_member_id
  for update;

  if not found or invited_member.inviter_id <> active_member then
    raise exception 'Only the member who issued this invitation can remove this member';
  end if;
  if invited_member.status <> 'active' then
    raise exception 'This member is no longer active';
  end if;

  update club_private.members
  set status = 'removed', updated_at = now()
  where user_id = requested_member_id;
end;
$$;

create function public.club_send_message(requested_recipient_id uuid, requested_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_member uuid := club_private.current_active_member_id();
  new_message_id uuid;
begin
  if active_member is null then
    raise exception 'Active club membership is required';
  end if;
  if not club_private.are_direct_connections(active_member, requested_recipient_id) then
    raise exception 'Messages are limited to direct invitation connections';
  end if;
  if exists (
    select 1 from club_private.blocks
    where (blocker_id = active_member and blocked_id = requested_recipient_id)
       or (blocker_id = requested_recipient_id and blocked_id = active_member)
  ) then
    raise exception 'This connection is unavailable';
  end if;
  insert into club_private.messages (sender_id, recipient_id, body)
  values (active_member, requested_recipient_id, requested_body)
  returning id into new_message_id;
  return new_message_id;
end;
$$;

create function public.club_list_messages(requested_connection_id uuid)
returns table (message_id uuid, sender_id uuid, recipient_id uuid, body text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  active_member uuid := club_private.current_active_member_id();
begin
  if active_member is null then
    raise exception 'Active club membership is required';
  end if;
  if not club_private.are_direct_connections(active_member, requested_connection_id) then
    raise exception 'Messages are limited to direct invitation connections';
  end if;
  if exists (
    select 1 from club_private.blocks
    where (blocker_id = active_member and blocked_id = requested_connection_id)
       or (blocker_id = requested_connection_id and blocked_id = active_member)
  ) then
    raise exception 'This connection is unavailable';
  end if;
  return query
  select message.id, message.sender_id, message.recipient_id, message.body, message.created_at
  from club_private.messages message
  where (message.sender_id = active_member and message.recipient_id = requested_connection_id)
     or (message.sender_id = requested_connection_id and message.recipient_id = active_member)
  order by message.created_at asc;
end;
$$;

revoke all on function public.club_remove_invited_member(uuid) from public;
revoke all on function public.club_send_message(uuid, text) from public;
revoke all on function public.club_list_messages(uuid) from public;

grant execute on function public.club_remove_invited_member(uuid) to authenticated;
grant execute on function public.club_send_message(uuid, text) to authenticated;
grant execute on function public.club_list_messages(uuid) to authenticated;

commit;
