begin;
-- Random, pronounceable secret words: six CVC syllables, 60 random bits.
-- Acceptance still requires the exact verified recipient, expiry, and single use.
create or replace function club_private.new_invitation_word()
returns text language plpgsql volatile security invoker set search_path='' as $$
declare
 entropy bytea:=sha256(convert_to(gen_random_uuid()::text||gen_random_uuid()::text,'UTF8'));
 word text:='';
 i integer;
begin
 for i in 0..5 loop
  word:=word||substr('bcdfghjklmnprstv',1+get_byte(entropy,i*3)%16,1)
            ||substr('aeio',1+get_byte(entropy,i*3+1)%4,1)
            ||substr('bcdfghjklmnprstv',1+get_byte(entropy,i*3+2)%16,1);
 end loop;
 return word;
end;
$$;
revoke all on function club_private.new_invitation_word() from public,anon,authenticated;
-- Preserve the current authorization logic and all existing invitation hashes.
do $migration$
declare
 original text:=pg_get_functiondef('club_private.membership_command(text,jsonb)'::regprocedure);
 updated text;
begin
 updated:=replace(original,
  $old$token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');$old$,
  $new$if payload->>'secret_word'='true' then
   token:=club_private.new_invitation_word();
  else
   token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
  end if;$new$);
 if updated=original then raise exception 'Invitation generator changed; review migration before applying.'; end if;
 execute updated;
end;
$migration$;
commit;
