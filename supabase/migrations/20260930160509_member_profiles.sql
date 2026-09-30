begin;
-- Private profile details are returned only to their owner. Circle views use an
-- explicit public projection and the existing reciprocal-block/connection checks.
create table club_private.member_profiles (
 member_id uuid primary key references club_private.members(id) on delete cascade,
 first_name text not null check(length(btrim(first_name)) between 1 and 50),
 last_name text not null check(length(btrim(last_name)) between 1 and 50),
 date_of_birth date not null,
 gender text not null default '' check(gender in ('','woman','man','nonbinary','self_describe','prefer_not_to_say')),
 gender_description text not null default '' check(length(gender_description)<=60),
 interests text[] not null default '{}' check(interests <@ array['dinner','drinks','discussion','dating','champagne','friendship']::text[] and cardinality(interests)<=6),
 photos jsonb not null default '[]' check(jsonb_typeof(photos)='array' and jsonb_array_length(photos)<=3 and octet_length(photos::text)<=280000),
 updated_at timestamptz not null default now()
);
alter table club_private.member_profiles enable row level security;
revoke all on club_private.member_profiles from public,anon,authenticated;
alter table club_private.members drop constraint members_display_name_check;
alter table club_private.members add constraint members_display_name_check check(length(btrim(display_name)) between 1 and 101);

create function club_private.profile_command(operation text,payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare me club_private.members; target club_private.members; details club_private.member_profiles; dob date; tags text[]; photo jsonb; bytes bytea; result jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in to continue.' using errcode='42501'; end if;
 select * into me from club_private.members where user_id=auth.uid() for update;
 if me.id is null or me.status<>'active' then raise exception 'An active membership is required.' using errcode='42501'; end if;
 if operation='profile_save' then
  if payload ? 'id' or payload ? 'member_id' or payload ? 'email' then raise exception 'Only your own profile can be edited. Account email is managed separately.' using errcode='42501'; end if;
  if length(btrim(coalesce(payload->>'first_name',''))) not between 1 and 50 or length(btrim(coalesce(payload->>'last_name',''))) not between 1 and 50 then raise exception 'Enter your first and last name (up to 50 characters each).'; end if;
  if coalesce(payload->>'date_of_birth','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Enter a valid date of birth.'; end if;
  dob:=(payload->>'date_of_birth')::date;
  if dob>(current_date-interval '18 years')::date or dob<(current_date-interval '120 years')::date then raise exception 'Members must be 18 or older. Check your date of birth.'; end if;
  if jsonb_typeof(payload->'interests') is distinct from 'array' or jsonb_array_length(payload->'interests')>6 then raise exception 'Choose valid meeting interests.'; end if;
  select coalesce(array_agg(distinct value),'{}') into tags from jsonb_array_elements_text(payload->'interests');
  if not(tags <@ array['dinner','drinks','discussion','dating','champagne','friendship']::text[]) then raise exception 'Choose valid meeting interests.'; end if;
  if jsonb_typeof(payload->'photos') is distinct from 'array' or jsonb_array_length(payload->'photos')>3 then raise exception 'Upload up to three photos.'; end if;
  for photo in select value from jsonb_array_elements(payload->'photos') loop
   if jsonb_typeof(photo)<>'string' or length(photo#>>'{}')>90000 or (photo#>>'{}') !~ '^data:image/jpeg;base64,[A-Za-z0-9+/]+={0,2}$' then raise exception 'Use a supported, resized JPEG photo.'; end if;
   bytes:=decode(substring(photo#>>'{}' from 24),'base64');
   if octet_length(bytes)<4 or substring(bytes from 1 for 2)<>decode('ffd8','hex') or substring(bytes from octet_length(bytes)-1 for 2)<>decode('ffd9','hex') then raise exception 'Invalid photo.'; end if;
  end loop;
  if length(coalesce(payload->>'bio',''))>300 then raise exception 'Keep your introduction under 300 characters.'; end if;
  insert into club_private.member_profiles(member_id,first_name,last_name,date_of_birth,gender,gender_description,interests,photos)
   values(me.id,btrim(payload->>'first_name'),btrim(payload->>'last_name'),dob,coalesce(payload->>'gender',''),case when payload->>'gender'='self_describe' then btrim(coalesce(payload->>'gender_description','')) else '' end,tags,payload->'photos')
   on conflict(member_id) do update set first_name=excluded.first_name,last_name=excluded.last_name,date_of_birth=excluded.date_of_birth,gender=excluded.gender,gender_description=excluded.gender_description,interests=excluded.interests,photos=excluded.photos,updated_at=now();
  update club_private.members set display_name=btrim(payload->>'first_name')||' '||btrim(payload->>'last_name'),bio=btrim(coalesce(payload->>'bio','')) where id=me.id;
  return jsonb_build_object('ok',true);
 elsif operation not in ('profile_get','profile_view') then raise exception 'Unsupported profile operation.'; end if;
 if operation='profile_get' then target:=me;
 else
  select m.* into target from club_private.visible_connections(me.id) v join club_private.members m on m.id=v.id where m.id=(payload->>'id')::uuid;
  if target.id is null then raise exception 'This profile is unavailable.' using errcode='42501'; end if;
 end if;
 select * into details from club_private.member_profiles where member_id=target.id;
 result:=jsonb_build_object('id',target.id,'display_name',target.display_name,'first_name',coalesce(details.first_name,target.display_name),'last_name',coalesce(details.last_name,''),'bio',target.bio,'interests',coalesce(details.interests,'{}'),'photos',coalesce(details.photos,'[]'::jsonb));
 if operation='profile_get' then result:=result||jsonb_build_object('email',(select email from auth.users where id=me.user_id),'date_of_birth',details.date_of_birth,'gender',coalesce(details.gender,''),'gender_description',coalesce(details.gender_description,'')); end if;
 return result;
end;
$$;
revoke all on function club_private.profile_command(text,jsonb) from public,anon;
grant execute on function club_private.profile_command(text,jsonb) to authenticated;
create or replace function public.club_command(operation text,payload jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path='' as $$
 select case when operation in ('profile_get','profile_save','profile_view') then club_private.profile_command(operation,payload)
 when operation in ('invitation_state','remove_invitee') then club_private.manage_invitee(operation,payload)
 else club_private.command(operation,payload) end;
$$;
revoke all on function public.club_command(text,jsonb) from public,anon;
grant execute on function public.club_command(text,jsonb) to authenticated;
commit;
