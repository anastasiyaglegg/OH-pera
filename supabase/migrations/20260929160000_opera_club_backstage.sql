begin;

-- Opera Club data is deliberately kept outside the public Data API schema.
-- Browser clients will use narrowly scoped server operations in a later migration.
create schema if not exists club_private;
revoke all on schema club_private from public;
revoke all on schema club_private from anon;
revoke all on schema club_private from authenticated;

create table club_private.members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  biography text not null default '' check (char_length(biography) <= 500),
  inviter_id uuid references club_private.members(user_id) on delete restrict,
  role text not null default 'member' check (role in ('member', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended', 'left', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table club_private.invitations (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references club_private.members(user_id) on delete restrict,
  intended_email text not null check (lower(intended_email) = intended_email and char_length(intended_email) <= 320),
  token_hash text not null unique check (char_length(token_hash) >= 32),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'cancelled', 'expired')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_by uuid references auth.users(id) on delete restrict,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  check ((status = 'accepted') = (accepted_by is not null and accepted_at is not null))
);

create unique index invitations_one_pending_per_inviter
  on club_private.invitations (inviter_id)
  where status = 'pending';

create table club_private.performances (
  performance_id text primary key check (char_length(performance_id) between 1 and 500),
  performance jsonb not null check (jsonb_typeof(performance) = 'object' and performance->>'id' = performance_id),
  source_updated_at timestamptz,
  imported_at timestamptz not null default now()
);

create table club_private.meetups (
  id uuid primary key default gen_random_uuid(),
  performance_id text not null references club_private.performances(performance_id) on delete restrict,
  host_user_id uuid not null references club_private.members(user_id) on delete restrict,
  title text not null check (char_length(trim(title)) between 1 and 120),
  details text not null default '' check (char_length(details) <= 1000),
  meeting_time timestamptz not null,
  meeting_location text not null check (char_length(trim(meeting_location)) between 1 and 250),
  capacity integer not null check (capacity between 2 and 30),
  status text not null default 'active' check (status in ('active', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index meetups_by_performance on club_private.meetups (performance_id, meeting_time)
  where status = 'active';

create table club_private.meetup_members (
  meetup_id uuid not null references club_private.meetups(id) on delete cascade,
  user_id uuid not null references club_private.members(user_id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (meetup_id, user_id)
);

-- The host is an attendee by definition. A later club command will insert this
-- row atomically when it publishes a meetup, along with capacity enforcement.
create index meetup_members_by_user on club_private.meetup_members (user_id, joined_at desc);

create table club_private.blocks (
  blocker_id uuid not null references club_private.members(user_id) on delete cascade,
  blocked_id uuid not null references club_private.members(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table club_private.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references club_private.members(user_id) on delete restrict,
  recipient_id uuid not null references club_private.members(user_id) on delete restrict,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create index messages_by_recipient on club_private.messages (recipient_id, created_at desc);
create index messages_by_sender on club_private.messages (sender_id, created_at desc);

alter table club_private.members enable row level security;
alter table club_private.invitations enable row level security;
alter table club_private.performances enable row level security;
alter table club_private.meetups enable row level security;
alter table club_private.meetup_members enable row level security;
alter table club_private.blocks enable row level security;
alter table club_private.messages enable row level security;

revoke all on all tables in schema club_private from public;
revoke all on all tables in schema club_private from anon;
revoke all on all tables in schema club_private from authenticated;

commit;
