begin;

-- Usernames keep the spelling a member chooses, while remaining unique without
-- regard to case through the existing lower(username) unique index.
alter table club_private.members drop constraint club_members_username_format;
alter table club_private.members
  add constraint club_members_username_format
  check (username is null or username ~ '^[A-Za-z0-9]{6,30}$');

create or replace function club_private.apply_member_profile_from_auth()
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
  requested_username := btrim(coalesce(profile->>'username', ''));
  requested_first_name := btrim(coalesce(profile->>'first_name', ''));
  requested_last_name := btrim(coalesce(profile->>'last_name', ''));
  requested_gender := nullif(btrim(coalesce(profile->>'gender', '')), '');

  if requested_username !~ '^[A-Za-z0-9]{6,30}$' then
    raise exception 'Choose a username with 6 to 30 letters or numbers.';
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
  if requested_gender is not null and requested_gender not in ('female', 'male', 'nonbinary', 'self_describe', 'prefer_not_to_say') then
    raise exception 'Choose a valid gender option.';
  end if;

  new.username := requested_username;
  new.first_name := requested_first_name;
  new.last_name := requested_last_name;
  new.date_of_birth := requested_dob;
  new.gender := requested_gender;
  return new;
end;
$$;

commit;
