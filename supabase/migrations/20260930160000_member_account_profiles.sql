begin;

alter table club_private.members
  add column username text,
  add column first_name text,
  add column last_name text,
  add column date_of_birth date,
  add column gender text,
  add column interests text[] not null default '{}',
  add column portrait_path text;

create unique index club_members_username_unique
  on club_private.members (lower(username))
  where username is not null;

alter table club_private.members
  add constraint club_members_username_format check (username is null or username ~ '^[a-z0-9_]{3,30}$'),
  add constraint club_members_first_name_length check (first_name is null or length(btrim(first_name)) between 1 and 80),
  add constraint club_members_last_name_length check (last_name is null or length(btrim(last_name)) between 1 and 80),
  add constraint club_members_gender_length check (gender is null or length(btrim(gender)) <= 50),
  add constraint club_members_interests_allowed check (interests <@ array['Dinner before the Opera','Drinks together','Opera Discussion','Open to Dating','Champagne and Chit-Chat']);

create function club_private.apply_member_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile jsonb;
  requested_username text;
  requested_first_name text;
  requested_last_name text;
  requested_dob date;
  requested_gender text;
begin
  select raw_user_meta_data into profile from auth.users where id = new.user_id;
  requested_username := lower(btrim(coalesce(profile->>'username', '')));
  requested_first_name := btrim(coalesce(profile->>'first_name', ''));
  requested_last_name := btrim(coalesce(profile->>'last_name', ''));
  requested_gender := nullif(btrim(coalesce(profile->>'gender', '')), '');

  if requested_username !~ '^[a-z0-9_]{3,30}$' then
    raise exception 'Choose a username with 3 to 30 lowercase letters, numbers, or underscores.';
  end if;
  if length(requested_first_name) not between 1 and 80 or length(requested_last_name) not between 1 and 80 then
    raise exception 'Enter your first and last name.';
  end if;
  begin
    requested_dob := (profile->>'date_of_birth')::date;
  exception when others then
    raise exception 'Enter a valid date of birth.';
  end;
  if requested_dob > current_date - interval '18 years' then
    raise exception 'Membership is for adults aged 18 and over.';
  end if;
  if requested_gender is not null and length(requested_gender) > 50 then
    raise exception 'Gender must be 50 characters or fewer.';
  end if;

  new.username := requested_username;
  new.first_name := requested_first_name;
  new.last_name := requested_last_name;
  new.date_of_birth := requested_dob;
  new.gender := requested_gender;
  return new;
end;
$$;

create trigger club_members_profile_from_auth
before insert on club_private.members
for each row execute function club_private.apply_member_profile_from_auth();

create function club_private.account_profile(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me club_private.members;
  requested_username text;
  requested_first_name text;
  requested_last_name text;
  requested_dob date;
  requested_gender text;
  requested_interests text[];
  requested_portrait_path text;
begin
  if auth.uid() is null then
    raise exception 'Sign in to continue.' using errcode = '42501';
  end if;
  select * into me from club_private.members where user_id = auth.uid() for update;
  if me.id is null or me.status <> 'active' then
    raise exception 'An active club membership is required.' using errcode = '42501';
  end if;

  if coalesce(payload->>'action', 'get') = 'get' then
    return jsonb_build_object(
      'username', me.username,
      'first_name', me.first_name,
      'last_name', me.last_name,
      'date_of_birth', me.date_of_birth,
      'gender', me.gender,
      'about_you', me.bio,
      'interests', me.interests,
      'portrait_path', me.portrait_path
    );
  end if;

  requested_username := lower(btrim(coalesce(payload->>'username', '')));
  requested_first_name := btrim(coalesce(payload->>'first_name', ''));
  requested_last_name := btrim(coalesce(payload->>'last_name', ''));
  requested_gender := nullif(btrim(coalesce(payload->>'gender', '')), '');
  requested_portrait_path := nullif(btrim(coalesce(payload->>'portrait_path', '')), '');
  select coalesce(array_agg(value), '{}') into requested_interests
  from jsonb_array_elements_text(coalesce(payload->'interests', '[]'::jsonb)) value;

  if requested_username !~ '^[a-z0-9_]{3,30}$' then
    raise exception 'Choose a username with 3 to 30 lowercase letters, numbers, or underscores.';
  end if;
  if length(requested_first_name) not between 1 and 80 or length(requested_last_name) not between 1 and 80 then
    raise exception 'Enter your first and last name.';
  end if;
  begin
    requested_dob := (payload->>'date_of_birth')::date;
  exception when others then
    raise exception 'Enter a valid date of birth.';
  end;
  if requested_dob > current_date - interval '18 years' then
    raise exception 'Membership is for adults aged 18 and over.';
  end if;
  if requested_gender is not null and length(requested_gender) > 50 then
    raise exception 'Gender must be 50 characters or fewer.';
  end if;
  if not (requested_interests <@ array['Dinner before the Opera','Drinks together','Opera Discussion','Open to Dating','Champagne and Chit-Chat']) then
    raise exception 'Choose only the listed interests.';
  end if;
  if requested_portrait_path is not null and requested_portrait_path !~ ('^' || auth.uid()::text || '/[a-z0-9._-]+$') then
    raise exception 'Portrait path is invalid.';
  end if;

  update club_private.members
  set username = requested_username,
      first_name = requested_first_name,
      last_name = requested_last_name,
      date_of_birth = requested_dob,
      gender = requested_gender,
      bio = left(coalesce(payload->>'about_you', ''), 300),
      interests = requested_interests,
      portrait_path = requested_portrait_path,
      display_name = requested_username
  where id = me.id;

  return club_private.account_profile(jsonb_build_object('action', 'get'));
end;
$$;

revoke all on function club_private.account_profile(jsonb) from public, anon;
grant execute on function club_private.account_profile(jsonb) to authenticated;

create or replace function public.club_command(operation text, payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if operation = 'admin_status' and payload->>'status' = 'left' then
    raise exception 'Only the direct inviter can remove a member.' using errcode = '42501';
  end if;

  if operation in ('invitation_state', 'remove_invitee') then
    return club_private.manage_invitee(operation, payload);
  end if;

  if operation = 'account_profile' then
    return club_private.account_profile(payload);
  end if;

  return club_private.command(operation, payload);
end;
$$;

revoke all on function public.club_command(text, jsonb) from public, anon;
grant execute on function public.club_command(text, jsonb) to authenticated;

insert into storage.buckets (id, name, public)
values ('club-portraits', 'club-portraits', false)
on conflict (id) do nothing;

create policy "Club members upload their own portrait"
on storage.objects for insert to authenticated
with check (bucket_id = 'club-portraits' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Club members update their own portrait"
on storage.objects for update to authenticated
using (bucket_id = 'club-portraits' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'club-portraits' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Club members read their own portrait"
on storage.objects for select to authenticated
using (bucket_id = 'club-portraits' and (storage.foldername(name))[1] = auth.uid()::text);

commit;
