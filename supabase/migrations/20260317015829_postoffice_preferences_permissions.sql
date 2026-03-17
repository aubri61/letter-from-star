begin;
-- Column-restricted INSERT/UPDATE grants are intentionally replaced by an RPC:
-- PostgREST UPSERT updates conflict columns too, requiring broader privileges.
create function public.set_daily_letters(p_enabled boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or p_enabled is null then raise exception 'authentication required'; end if;
 insert into public.user_preferences(user_id,daily_letters_enabled) values(auth.uid(),p_enabled)
 on conflict(user_id) do update set daily_letters_enabled=excluded.daily_letters_enabled;
end;$$;
revoke insert,update on public.user_preferences from authenticated;
revoke insert(user_id,daily_letters_enabled),update(daily_letters_enabled) on public.user_preferences from authenticated;
revoke all on function public.set_daily_letters(boolean) from public,anon;
grant execute on function public.set_daily_letters(boolean) to authenticated;
commit;
