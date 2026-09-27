begin;
create table public.saved_performances (
 user_id uuid not null references auth.users(id) on delete cascade,
 performance_id text not null check (length(performance_id) between 1 and 500),
 performance jsonb not null check (jsonb_typeof(performance) = 'object' and performance->>'id' = performance_id),
 created_at timestamptz not null default now(),
 primary key (user_id, performance_id)
);
alter table public.saved_performances enable row level security;
revoke all on public.saved_performances from anon;
revoke all on public.saved_performances from authenticated;
grant select, insert, delete on public.saved_performances to authenticated;
create policy "Read own saves" on public.saved_performances for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own saves" on public.saved_performances for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Delete own saves" on public.saved_performances for delete to authenticated using ((select auth.uid()) = user_id);
commit;
