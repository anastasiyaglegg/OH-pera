begin;

-- Leaving the club is a relationship action, not an administrative action.
-- Only manage_invitee may set a member to "left", and it verifies that the
-- signed-in member is that person's direct inviter.
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

  return club_private.command(operation, payload);
end;
$$;

revoke all on function public.club_command(text, jsonb) from public, anon;
grant execute on function public.club_command(text, jsonb) to authenticated;

commit;
