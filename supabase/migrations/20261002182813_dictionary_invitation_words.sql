begin;
-- A word is an invitation prompt, not a substitute for verified-email login.
-- Hash with the recipient to allow the same dictionary word for different people.
-- Do not reuse a previous word for the same recipient, even after revocation.
create or replace function club_private.new_invitation_word(recipient text)
returns text language plpgsql volatile security invoker set search_path='' as $$
declare chosen text;
begin
 select candidate into chosen from unnest(array['amber','amethyst','apple','apricot','aria','aster','autumn','ballet','basil','blossom','breeze','brook','butterfly','cadence','camellia','candle','cedar','cello','cherry','clover','cobalt','coral','crystal','dahlia','dawn','dolphin','dove','dream','echo','emerald','falcon','feather','fern','finch','flora','forest','garden','garnet','ginger','glimmer','golden','grace','harmony','harp','hazel','heather','heron','honey','iris','island','ivory','jasmine','jade','juniper','lagoon','lantern','laurel','lavender','lemon','lilac','lily','lotus','lyric','magnolia','maple','marigold','meadow','melody','midnight','mist','moon','moonlight','morning','moss','nectar','nightingale','oak','ocean','olive','onyx','opera','orchid','otter','pearl','pebble','peony','petal','pine','plum','poplar','poppy','primrose','quartz','rainbow','raven','river','robin','rose','rosemary','ruby','saffron','sage','sapphire','satin','scarlet','sea','shell','silver','sky','snow','snowdrop','sonata','song','sparrow','spring','star','starlight','stone','summer','sunset','swan','symphony','thyme','tulip','velvet','violet','violin','willow','winter','wren','zephyr']) candidate
 where not exists(select 1 from club_private.invitations i
  where i.token_hash=encode(sha256(convert_to(recipient||':'||candidate,'UTF8')),'hex'))
 order by sha256(convert_to(gen_random_uuid()::text||candidate,'UTF8')) limit 1;
 if chosen is null then raise exception 'No unused invitation word remains for this email. Contact support.'; end if;
 return chosen;
end;
$$;
revoke all on function club_private.new_invitation_word(text) from public,anon,authenticated;
do $migration$
declare original text:=pg_get_functiondef('club_private.membership_command(text,jsonb)'::regprocedure); updated text;
begin
 updated:=replace(original,'token:=club_private.new_invitation_word();','token:=club_private.new_invitation_word(recipient);');
 if updated=original then raise exception 'Unexpected invitation generator; review required.'; end if;
 updated:=replace(updated,
 $old$values(me.id,recipient,encode(sha256(convert_to(token,'UTF8')),'hex'))$old$,
 $new$values(me.id,recipient,encode(sha256(convert_to(case when payload->>'secret_word'='true' then recipient||':'||token else token end,'UTF8')),'hex'))$new$);
 updated:=replace(updated,
 $old$where token_hash=encode(sha256(convert_to(coalesce(payload->>'token',''),'UTF8')),'hex');$old$,
 $new$where token_hash=encode(sha256(convert_to(coalesce(payload->>'token',''),'UTF8')),'hex')
  or token_hash=(select encode(sha256(convert_to(lower(btrim(u.email))||':'||lower(btrim(coalesce(payload->>'token',''))),'UTF8')),'hex') from auth.users u where u.id=uid and u.email_confirmed_at is not null);$new$);
 execute updated;
end;
$migration$;
commit;
