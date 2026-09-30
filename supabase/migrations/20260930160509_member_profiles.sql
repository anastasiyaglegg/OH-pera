begin;
-- Account fields stay canonical in members; this table stores only the gallery.
-- Private profile details are returned only to their owner. Circle views use an
-- explicit public projection and the existing reciprocal-block/connection checks.
create table club_private.member_profiles (
 member_id uuid primary key references club_private.members(id) on delete cascade,
 photos jsonb not null default '[]' check(jsonb_typeof(photos)='array' and jsonb_array_length(photos)<=3 and octet_length(photos::text)<=280000),
 updated_at timestamptz not null default now()
);
alter table club_private.member_profiles enable row level security;
revoke all on club_private.member_profiles from public,anon,authenticated;
alter table club_private.members drop constraint members_display_name_check;
alter table club_private.members add constraint members_display_name_check check(length(btrim(display_name)) between 1 and 161);

alter table club_private.members drop constraint club_members_interests_allowed;
alter table club_private.members add constraint club_members_interests_allowed check (interests <@ array['Dinner before the Opera','Drinks together','Opera Discussion','Open to Dating','Champagne and Chit-Chat','Making friends']);

create function club_private.profile_command(operation text,payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare me club_private.members; target club_private.members; details club_private.member_profiles; dob date; tags text[]; photo jsonb; bytes bytea; result jsonb; requested_username text; requested_gender text;
begin
 if auth.uid() is null then raise exception 'Sign in to continue.' using errcode='42501'; end if;
 select * into me from club_private.members where user_id=auth.uid() for update;
 if me.id is null or me.status<>'active' then raise exception 'An active membership is required.' using errcode='42501'; end if;
 if operation='profile_save' then
  if payload ? 'id' or payload ? 'member_id' or payload ? 'email' then raise exception 'Only your own profile can be edited. Account email is managed separately.' using errcode='42501'; end if;
  if length(btrim(coalesce(payload->>'first_name',''))) not between 1 and 80 or length(btrim(coalesce(payload->>'last_name',''))) not between 1 and 80 then raise exception 'Enter your first and last name (up to 80 characters each).'; end if;
  if coalesce(payload->>'date_of_birth','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Enter a valid date of birth.'; end if;
  dob:=(payload->>'date_of_birth')::date;
  if dob>(current_date-interval '18 years')::date or dob<(current_date-interval '120 years')::date then raise exception 'Members must be 18 or older. Check your date of birth.'; end if;
  if jsonb_typeof(payload->'interests') is distinct from 'array' or jsonb_array_length(payload->'interests')>6 then raise exception 'Choose valid meeting interests.'; end if;
  select coalesce(array_agg(value order by first_position),'{}') into tags from (select value,min(position) as first_position from jsonb_array_elements_text(payload->'interests') with ordinality as selected(value,position) group by value) ordered_interests;
  if not(tags <@ array['dinner','drinks','discussion','dating','champagne','friendship']::text[]) then raise exception 'Choose valid meeting interests.'; end if;
  if jsonb_typeof(payload->'photos') is distinct from 'array' or jsonb_array_length(payload->'photos')>3 then raise exception 'Upload up to three photos.'; end if;
  for photo in select value from jsonb_array_elements(payload->'photos') loop
   if jsonb_typeof(photo)<>'string' or length(photo#>>'{}')>90000 or (photo#>>'{}') !~ '^data:image/jpeg;base64,[A-Za-z0-9+/]+={0,2}$' then raise exception 'Use a supported, resized JPEG photo.'; end if;
   bytes:=decode(substring(photo#>>'{}' from 24),'base64');
   if octet_length(bytes)<4 or substring(bytes from 1 for 2)<>decode('ffd8','hex') or substring(bytes from octet_length(bytes)-1 for 2)<>decode('ffd9','hex') then raise exception 'Invalid photo.'; end if;
  end loop;
  if length(coalesce(payload->>'bio',''))>300 then raise exception 'Keep your introduction under 300 characters.'; end if;
  requested_username:=lower(btrim(coalesce(payload->>'username',me.username,'')));
  if requested_username !~ '^[a-z0-9_]{3,30}$' then raise exception 'Choose a username with 3 to 30 lowercase letters, numbers, or underscores.'; end if;
  if coalesce(payload->>'gender','') not in ('','woman','man','nonbinary','self_describe','prefer_not_to_say') then raise exception 'Choose a valid gender option.'; end if;
  requested_gender:=case payload->>'gender' when 'woman' then 'Woman' when 'man' then 'Man' when 'nonbinary' then 'Non-binary' when 'prefer_not_to_say' then 'Prefer not to say' when 'self_describe' then btrim(coalesce(payload->>'gender_description','')) else null end;
  if length(coalesce(requested_gender,''))>50 then raise exception 'Gender must be 50 characters or fewer.'; end if;
  insert into club_private.member_profiles(member_id,photos) values(me.id,payload->'photos')
   on conflict(member_id) do update set photos=excluded.photos,updated_at=now();
  update club_private.members set username=requested_username,first_name=btrim(payload->>'first_name'),last_name=btrim(payload->>'last_name'),date_of_birth=dob,gender=requested_gender,
   interests=array(select case tag when 'dinner' then 'Dinner before the Opera' when 'drinks' then 'Drinks together' when 'discussion' then 'Opera Discussion' when 'dating' then 'Open to Dating' when 'champagne' then 'Champagne and Chit-Chat' when 'friendship' then 'Making friends' end from unnest(tags) with ordinality as chosen(tag,position) order by position),
   display_name=btrim(payload->>'first_name')||' '||btrim(payload->>'last_name'),bio=btrim(coalesce(payload->>'bio','')) where id=me.id;
  return jsonb_build_object('ok',true);
 elsif operation not in ('profile_get','profile_view') then raise exception 'Unsupported profile operation.'; end if;
 if operation='profile_get' then target:=me;
 else
  select m.* into target from club_private.visible_connections(me.id) v join club_private.members m on m.id=v.id where m.id=(payload->>'id')::uuid;
  if target.id is null then raise exception 'This profile is unavailable.' using errcode='42501'; end if;
 end if;
 select * into details from club_private.member_profiles where member_id=target.id;
 select coalesce(array_agg(case tag when 'Dinner before the Opera' then 'dinner' when 'Drinks together' then 'drinks' when 'Opera Discussion' then 'discussion' when 'Open to Dating' then 'dating' when 'Champagne and Chit-Chat' then 'champagne' when 'Making friends' then 'friendship' end order by position),'{}') into tags from unnest(target.interests) with ordinality as chosen(tag,position);
 result:=jsonb_build_object('id',target.id,'display_name',target.display_name,'first_name',coalesce(target.first_name,target.display_name),'last_name',coalesce(target.last_name,''),'bio',target.bio,'interests',tags,'photos',coalesce(details.photos,'[]'::jsonb));
 if operation='profile_get' then result:=result||jsonb_build_object('username',me.username,'portrait_path',me.portrait_path,'email',(select email from auth.users where id=me.user_id),'date_of_birth',me.date_of_birth,
  'gender',case lower(coalesce(me.gender,'')) when '' then '' when 'woman' then 'woman' when 'man' then 'man' when 'non-binary' then 'nonbinary' when 'nonbinary' then 'nonbinary' when 'prefer not to say' then 'prefer_not_to_say' else 'self_describe' end,
  'gender_description',case when lower(coalesce(me.gender,'')) in ('','woman','man','non-binary','nonbinary','prefer not to say') then '' else me.gender end); end if;
 return result;
end;
$$;
revoke all on function club_private.profile_command(text,jsonb) from public,anon;
grant execute on function club_private.profile_command(text,jsonb) to authenticated;
create or replace function public.club_command(operation text,payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 -- Preserve main's restriction: administrative actions cannot remove members.
 if operation='admin_status' and payload->>'status'='left' then
  raise exception 'Only the direct inviter can remove a member.' using errcode='42501';
 end if;
 if operation in ('profile_get','profile_save','profile_view') then return club_private.profile_command(operation,payload); end if;
 if operation in ('invitation_state','remove_invitee') then return club_private.manage_invitee(operation,payload); end if;
 if operation='account_profile' then return club_private.account_profile(payload); end if;
 return club_private.command(operation,payload);
end;
$$;
revoke all on function public.club_command(text,jsonb) from public,anon;
grant execute on function public.club_command(text,jsonb) to authenticated;
commit;
