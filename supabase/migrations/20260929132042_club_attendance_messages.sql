begin;
create table club_private.performances(
 id text primary key, snapshot jsonb not null, day date not null,
 revision integer not null default 1, cancelled boolean not null default false
);
create table club_private.attendance(
 member_id uuid not null references club_private.members(id),
 performance_id text not null references club_private.performances(id),
 confirmed_revision integer not null, primary key(member_id,performance_id)
);
create table club_private.messages(
 id bigint generated always as identity primary key,
 sender_id uuid not null references club_private.members(id),
 recipient_id uuid not null references club_private.members(id),
 body text not null check(length(btrim(body)) between 1 and 2000),
 created_at timestamptz not null default now(), read_at timestamptz,
 check(sender_id<>recipient_id)
);
create index club_messages_recipient on club_private.messages(recipient_id,id);
create index club_messages_sender on club_private.messages(sender_id,id);
create index club_attendance_performance on club_private.attendance(performance_id);
alter table club_private.performances enable row level security;
alter table club_private.attendance enable row level security;
alter table club_private.messages enable row level security;
revoke all on club_private.performances,club_private.attendance,club_private.messages from public,anon,authenticated;

-- Trusted schedule import only. Missing listings are retained, never assumed cancelled.
create function club_private.sync_schedule(items jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare p jsonb;
begin
 if jsonb_typeof(items)<>'array' or jsonb_array_length(items)>5000 then raise exception 'Invalid schedule.'; end if;
 for p in select value from jsonb_array_elements(items) loop
  if coalesce(p->>'id','')='' or coalesce(p->>'title','')='' or p->>'date' is null then raise exception 'Invalid performance.'; end if;
  insert into club_private.performances as old(id,snapshot,day,cancelled)
  values(p->>'id',p,(p->>'date')::date,coalesce(p->>'status'='cancelled',false))
  on conflict(id) do update set snapshot=excluded.snapshot,day=excluded.day,cancelled=excluded.cancelled,
  revision=old.revision+case when jsonb_build_array(old.snapshot->>'date',old.snapshot->>'time',old.snapshot->>'venue',old.cancelled)
   is distinct from jsonb_build_array(excluded.snapshot->>'date',excluded.snapshot->>'time',excluded.snapshot->>'venue',excluded.cancelled) then 1 else 0 end;
 end loop;
end;
$$;
revoke all on function club_private.sync_schedule(jsonb) from public,anon,authenticated;
grant usage on schema club_private to service_role;
grant execute on function club_private.sync_schedule(jsonb) to service_role;
create function public.club_sync_schedule(items jsonb) returns void language sql security invoker set search_path='' as $$ select club_private.sync_schedule(items); $$;
revoke all on function public.club_sync_schedule(jsonb) from public,anon,authenticated;
grant execute on function public.club_sync_schedule(jsonb) to service_role;

alter function club_private.command(text,jsonb) rename to membership_command;
revoke all on function club_private.membership_command(text,jsonb) from public,anon,authenticated;
create function club_private.command(operation text,payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare me club_private.members; event club_private.performances; result jsonb; target uuid;
 today date:=(now() at time zone 'America/New_York')::date; eligible boolean; cursor_id bigint;
begin
 if operation not in ('calendar','plans','attend','withdraw','inbox','thread','send','mark_read') then
  return club_private.membership_command(operation,payload);
 end if;
 if auth.uid() is null then raise exception 'Sign in to continue.' using errcode='42501'; end if;
 select * into me from club_private.members where user_id=auth.uid();
 if me.id is null or me.status<>'active' then raise exception 'Active membership required.' using errcode='42501'; end if;
 if operation in ('calendar','plans') then
  select coalesce(jsonb_agg(item order by day,id),'[]'::jsonb) into result from (
   select p.day,p.id,jsonb_build_object('performance',p.snapshot,'revision',p.revision,
    'mine',case when own.member_id is null then null when p.cancelled then 'cancelled' when own.confirmed_revision<>p.revision then 'reconfirm' else 'going' end,
    'total',case when p.day<today or p.cancelled then 0 else (select count(*) from club_private.attendance a join club_private.members m on m.id=a.member_id where a.performance_id=p.id and a.confirmed_revision=p.revision and m.status='active' and m.user_id is not null) end,
    'people',case when p.day<today or p.cancelled then '[]'::jsonb else (select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'display_name',m.display_name,'relationship',case when m.id=me.inviter_id then 'Your inviter' when m.inviter_id=me.id then 'Your invitee' else 'Your invitee’s invitee' end) order by m.display_name),'[]'::jsonb) from club_private.attendance a join club_private.members m on m.id=a.member_id join club_private.visible_connections(me.id) v on v.id=m.id where a.performance_id=p.id and a.confirmed_revision=p.revision and (m.id=me.inviter_id or m.inviter_id=me.id or exists(select 1 from club_private.members direct where direct.id=m.inviter_id and direct.inviter_id=me.id))) end) item
   from club_private.performances p left join club_private.attendance own on own.performance_id=p.id and own.member_id=me.id
   where (operation='calendar' and p.day>=today) or (operation='plans' and own.member_id is not null)
  ) entries;
  return result;
 elsif operation in ('attend','withdraw') then
  -- Schedule row lock serializes confirmation against schedule updates.
  select * into event from club_private.performances where id=payload->>'id' for update;
  if event.id is null then raise exception 'Performance unavailable.'; end if;
  perform 1 from club_private.members where id=me.id and status='active' for update;
  if not found then raise exception 'Active membership required.'; end if;
  if operation='withdraw' then delete from club_private.attendance where member_id=me.id and performance_id=event.id;
  else
   if event.cancelled or event.day<today then raise exception 'Attendance is closed for this performance.'; end if;
   if (payload->>'revision')::integer is distinct from event.revision then raise exception 'The performance changed. Refresh and confirm the new details.'; end if;
   insert into club_private.attendance values(me.id,event.id,event.revision) on conflict(member_id,performance_id) do update set confirmed_revision=excluded.confirmed_revision;
  end if;
  return jsonb_build_object('ok',true);
 elsif operation='inbox' then
  select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'display_name',case when m.status<>'active' or m.user_id is null then 'Former member' when v.id is null then 'Unavailable connection' else m.display_name end,
   'can_message',v.id is not null,'unread',(select count(*) from club_private.messages x where x.sender_id=m.id and x.recipient_id=me.id and x.read_at is null)) order by m.display_name),'[]'::jsonb)
  into result from club_private.members m left join club_private.visible_connections(me.id) v on v.id=m.id
  where v.id is not null or exists(select 1 from club_private.messages x where (x.sender_id=me.id and x.recipient_id=m.id) or (x.recipient_id=me.id and x.sender_id=m.id));
  return result;
 else
  target:=(payload->>'id')::uuid;
  -- Pair ordering makes send vs block/status operations serialize on member locks.
  perform 1 from club_private.members where id in (me.id,target) order by id for update;
  if not exists(select 1 from club_private.members where id=me.id and status='active' and user_id=auth.uid()) then raise exception 'Active membership required.'; end if;
  eligible:=exists(select 1 from club_private.visible_connections(me.id) where id=target);
  if operation='send' then
   if not eligible then raise exception 'This connection is not available for messaging.' using errcode='42501'; end if;
   if length(btrim(coalesce(payload->>'body',''))) not between 1 and 2000 then raise exception 'Messages must contain 1–2000 characters.'; end if;
   insert into club_private.messages(sender_id,recipient_id,body) values(me.id,target,btrim(payload->>'body'));
   return jsonb_build_object('ok',true);
  end if;
  if not eligible and not exists(select 1 from club_private.messages where (sender_id=me.id and recipient_id=target) or (sender_id=target and recipient_id=me.id)) then raise exception 'Conversation unavailable.' using errcode='42501'; end if;
  if operation='mark_read' then
   -- Only acknowledge IDs actually displayed; a concurrent new message stays unread.
   cursor_id:=(payload->>'through')::bigint;
   update club_private.messages set read_at=now() where sender_id=target and recipient_id=me.id and id<=cursor_id and read_at is null;
   return jsonb_build_object('ok',true);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',x.id::text,'mine',x.sender_id=me.id,'body',x.body,'created_at',x.created_at) order by x.id),'[]'::jsonb) into result
  from (select * from club_private.messages where ((sender_id=me.id and recipient_id=target) or (sender_id=target and recipient_id=me.id)) and (payload->>'before' is null or id<(payload->>'before')::bigint) order by id desc limit 50) x;
  return jsonb_build_object('messages',result,'can_message',eligible);
 end if;
end;
$$;
revoke all on function club_private.command(text,jsonb) from public,anon,authenticated;
grant execute on function club_private.command(text,jsonb) to authenticated;
-- Rebind wrapper explicitly after the original function rename.
create or replace function public.club_command(operation text,payload jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path='' as $$select club_private.command(operation,payload);$$;
commit;
