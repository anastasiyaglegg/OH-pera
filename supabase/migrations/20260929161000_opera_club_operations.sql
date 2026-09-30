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

create function public.club_list_meetups()
returns table (
  meetup_id uuid,
  performance_id text,
  title text,
  details text,
  meeting_time timestamptz,
  meeting_location text,
  capacity integer,
  host_name text,
  attendee_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.performance_id, m.title, m.details, m.meeting_time, m.meeting_location,
    m.capacity, host.display_name, count(attendee.user_id)
  from club_private.meetups m
  join club_private.members host on host.user_id = m.host_user_id
  left join club_private.meetup_members attendee on attendee.meetup_id = m.id
  where club_private.current_active_member_id() is not null
    and m.status = 'active'
  group by m.id, host.display_name
  order by m.meeting_time asc
$$;

create function public.club_create_meetup(
  requested_performance_id text,
  requested_title text,
  requested_details text,
  requested_meeting_time timestamptz,
  requested_meeting_location text,
  requested_capacity integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_member uuid := club_private.current_active_member_id();
  new_meetup_id uuid;
begin
  if active_member is null then
    raise exception 'Active club membership is required';
  end if;
  if not exists (select 1 from club_private.performances where performance_id = requested_performance_id) then
    raise exception 'The selected performance is unavailable';
  end if;
  if requested_meeting_time is null or requested_meeting_location is null or requested_capacity not between 2 and 30 then
    raise exception 'Meetup details are invalid';
  end if;

  insert into club_private.meetups (
    performance_id, host_user_id, title, details, meeting_time, meeting_location, capacity
  ) values (
    requested_performance_id, active_member, requested_title, coalesce(requested_details, ''),
    requested_meeting_time, requested_meeting_location, requested_capacity
  ) returning id into new_meetup_id;

  insert into club_private.meetup_members (meetup_id, user_id) values (new_meetup_id, active_member);
  return new_meetup_id;
end;
$$;

create function public.club_join_meetup(requested_meetup_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_member uuid := club_private.current_active_member_id();
  selected_meetup club_private.meetups%rowtype;
  current_attendee_count integer;
begin
  if active_member is null then
    raise exception 'Active club membership is required';
  end if;
  select * into selected_meetup from club_private.meetups where id = requested_meetup_id for update;
  if not found or selected_meetup.status <> 'active' then
    raise exception 'This meetup is unavailable';
  end if;
  if exists (select 1 from club_private.meetup_members where meetup_id = requested_meetup_id and user_id = active_member) then
    return;
  end if;
  select count(*) into current_attendee_count from club_private.meetup_members where meetup_id = requested_meetup_id;
  if current_attendee_count >= selected_meetup.capacity then
    raise exception 'This meetup is full';
  end if;
  insert into club_private.meetup_members (meetup_id, user_id) values (requested_meetup_id, active_member);
end;
$$;

create function public.club_leave_meetup(requested_meetup_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_member uuid := club_private.current_active_member_id();
begin
  if active_member is null then
    raise exception 'Active club membership is required';
  end if;
  if exists (select 1 from club_private.meetups where id = requested_meetup_id and host_user_id = active_member) then
    raise exception 'Hosts must cancel their meetup instead of leaving it';
  end if;
  delete from club_private.meetup_members where meetup_id = requested_meetup_id and user_id = active_member;
end;
$$;

create function public.club_cancel_meetup(requested_meetup_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_member uuid := club_private.current_active_member_id();
begin
  if active_member is null then
    raise exception 'Active club membership is required';
  end if;
  update club_private.meetups
  set status = 'cancelled', updated_at = now()
  where id = requested_meetup_id
    and (host_user_id = active_member or club_private.current_member_is_admin());
  if not found then
    raise exception 'Only the host or an administrator can cancel this meetup';
  end if;
end;
$$;

create function public.club_update_meetup(
  requested_meetup_id uuid,
  requested_title text,
  requested_details text,
  requested_meeting_time timestamptz,
  requested_meeting_location text,
  requested_capacity integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_member uuid := club_private.current_active_member_id();
  current_attendee_count integer;
begin
  if active_member is null then
    raise exception 'Active club membership is required';
  end if;
  if requested_meeting_time is null or requested_meeting_location is null or requested_capacity not between 2 and 30 then
    raise exception 'Meetup details are invalid';
  end if;
  select count(*) into current_attendee_count from club_private.meetup_members where meetup_id = requested_meetup_id;
  if requested_capacity < current_attendee_count then
    raise exception 'Capacity cannot be lower than the current attendee count';
  end if;
  update club_private.meetups
  set title = requested_title,
    details = coalesce(requested_details, ''),
    meeting_time = requested_meeting_time,
    meeting_location = requested_meeting_location,
    capacity = requested_capacity,
    updated_at = now()
  where id = requested_meetup_id
    and status = 'active'
    and (host_user_id = active_member or club_private.current_member_is_admin());
  if not found then
    raise exception 'Only the host or an administrator can edit this meetup';
  end if;
end;
$$;

create function public.club_meetup_attendees(requested_meetup_id uuid)
returns table (member_id uuid, display_name text, joined_at timestamptz, attendee_count bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  active_member uuid := club_private.current_active_member_id();
  host_member uuid;
  may_see_everyone boolean;
begin
  if active_member is null then
    raise exception 'Active club membership is required';
  end if;
  select host_user_id into host_member from club_private.meetups where id = requested_meetup_id;
  if host_member is null then
    raise exception 'This meetup is unavailable';
  end if;
  may_see_everyone := host_member = active_member or club_private.current_member_is_admin();

  return query
  select attendee.user_id, member.display_name, attendee.joined_at,
    count(*) over ()
  from club_private.meetup_members attendee
  join club_private.members member on member.user_id = attendee.user_id
  where attendee.meetup_id = requested_meetup_id
    and (may_see_everyone or attendee.user_id = active_member or club_private.are_direct_connections(active_member, attendee.user_id))
  order by attendee.joined_at asc;
end;
$$;

create function public.club_remove_meetup_member(requested_meetup_id uuid, requested_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_member uuid := club_private.current_active_member_id();
  host_member uuid;
begin
  if active_member is null then
    raise exception 'Active club membership is required';
  end if;
  select host_user_id into host_member from club_private.meetups where id = requested_meetup_id for update;
  if host_member is null or (host_member <> active_member and not club_private.current_member_is_admin()) then
    raise exception 'Only the host or an administrator can remove members';
  end if;
  if requested_member_id = host_member then
    raise exception 'The host cannot be removed from their own meetup';
  end if;
  delete from club_private.meetup_members where meetup_id = requested_meetup_id and user_id = requested_member_id;
end;
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

  update club_private.meetups
  set status = 'cancelled', updated_at = now()
  where host_user_id = requested_member_id and status = 'active';

  delete from club_private.meetup_members
  where user_id = requested_member_id;

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

revoke all on function public.club_list_meetups() from public;
revoke all on function public.club_create_meetup(text, text, text, timestamptz, text, integer) from public;
revoke all on function public.club_join_meetup(uuid) from public;
revoke all on function public.club_leave_meetup(uuid) from public;
revoke all on function public.club_cancel_meetup(uuid) from public;
revoke all on function public.club_update_meetup(uuid, text, text, timestamptz, text, integer) from public;
revoke all on function public.club_meetup_attendees(uuid) from public;
revoke all on function public.club_remove_meetup_member(uuid, uuid) from public;
revoke all on function public.club_remove_invited_member(uuid) from public;
revoke all on function public.club_send_message(uuid, text) from public;
revoke all on function public.club_list_messages(uuid) from public;

grant execute on function public.club_list_meetups() to authenticated;
grant execute on function public.club_create_meetup(text, text, text, timestamptz, text, integer) to authenticated;
grant execute on function public.club_join_meetup(uuid) to authenticated;
grant execute on function public.club_leave_meetup(uuid) to authenticated;
grant execute on function public.club_cancel_meetup(uuid) to authenticated;
grant execute on function public.club_update_meetup(uuid, text, text, timestamptz, text, integer) to authenticated;
grant execute on function public.club_meetup_attendees(uuid) to authenticated;
grant execute on function public.club_remove_meetup_member(uuid, uuid) to authenticated;
grant execute on function public.club_remove_invited_member(uuid) to authenticated;
grant execute on function public.club_send_message(uuid, text) to authenticated;
grant execute on function public.club_list_messages(uuid) to authenticated;

commit;
