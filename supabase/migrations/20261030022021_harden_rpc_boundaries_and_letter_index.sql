-- Keep privileged implementations outside exposed API schemas.
-- Public RPC signatures remain stable; ownership checks stay in private implementations.
begin;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;
create index letters_cat_user_idx on public.letters(cat_id,user_id);

alter function public.save_cat(text,text,text,text,text[],integer) set schema private;
revoke all on function private.save_cat(text,text,text,text,text[],integer) from public,anon,authenticated,service_role;
grant execute on function private.save_cat(text,text,text,text,text[],integer) to authenticated;
create function public.save_cat(p_name text,p_personality text,p_favorites text,p_memories text,p_paths text[],p_primary integer) returns uuid
language sql security invoker set search_path='' as $$
 select private.save_cat(p_name,p_personality,p_favorites,p_memories,p_paths,p_primary);
$$;
revoke all on function public.save_cat(text,text,text,text,text[],integer) from public,anon,authenticated,service_role;
grant execute on function public.save_cat(text,text,text,text,text[],integer) to authenticated;

alter function public.delete_cat() set schema private;
revoke all on function private.delete_cat() from public,anon,authenticated,service_role;
grant execute on function private.delete_cat() to authenticated;
create function public.delete_cat() returns void
language sql security invoker set search_path='' as $$
 select private.delete_cat();
$$;
revoke all on function public.delete_cat() from public,anon,authenticated,service_role;
grant execute on function public.delete_cat() to authenticated;

alter function public.send_letter(uuid,text,text) set schema private;
revoke all on function private.send_letter(uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function private.send_letter(uuid,text,text) to authenticated;
create function public.send_letter(p_request_id uuid,p_title text,p_content text) returns uuid
language sql security invoker set search_path='' as $$
 select private.send_letter(p_request_id,p_title,p_content);
$$;
revoke all on function public.send_letter(uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.send_letter(uuid,text,text) to authenticated;

alter function public.mark_letter_read(uuid) set schema private;
revoke all on function private.mark_letter_read(uuid) from public,anon,authenticated,service_role;
grant execute on function private.mark_letter_read(uuid) to authenticated;
create function public.mark_letter_read(p_id uuid) returns void
language sql security invoker set search_path='' as $$
 select private.mark_letter_read(p_id);
$$;
revoke all on function public.mark_letter_read(uuid) from public,anon,authenticated,service_role;
grant execute on function public.mark_letter_read(uuid) to authenticated;

alter function public.set_daily_letters(boolean) set schema private;
revoke all on function private.set_daily_letters(boolean) from public,anon,authenticated,service_role;
grant execute on function private.set_daily_letters(boolean) to authenticated;
create function public.set_daily_letters(p_enabled boolean) returns void
language sql security invoker set search_path='' as $$
 select private.set_daily_letters(p_enabled);
$$;
revoke all on function public.set_daily_letters(boolean) from public,anon,authenticated,service_role;
grant execute on function public.set_daily_letters(boolean) to authenticated;

alter function public.claim_letter_jobs(integer,timestamptz) set schema private;
revoke all on function private.claim_letter_jobs(integer,timestamptz) from public,anon,authenticated,service_role;
grant execute on function private.claim_letter_jobs(integer,timestamptz) to service_role;
create function public.claim_letter_jobs(p_limit integer default 3,p_now timestamptz default now()) returns setof public.letter_jobs
language sql security invoker set search_path='' as $$
 select * from private.claim_letter_jobs(p_limit,p_now);
$$;
revoke all on function public.claim_letter_jobs(integer,timestamptz) from public,anon,authenticated,service_role;
grant execute on function public.claim_letter_jobs(integer,timestamptz) to service_role;

alter function public.finish_letter_job(uuid,uuid,text,text) set schema private;
revoke all on function private.finish_letter_job(uuid,uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function private.finish_letter_job(uuid,uuid,text,text) to service_role;
create function public.finish_letter_job(p_job uuid,p_lease uuid,p_title text,p_content text) returns boolean
language sql security invoker set search_path='' as $$
 select private.finish_letter_job(p_job,p_lease,p_title,p_content);
$$;
revoke all on function public.finish_letter_job(uuid,uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.finish_letter_job(uuid,uuid,text,text) to service_role;

alter function public.fail_letter_job(uuid,uuid,text) set schema private;
revoke all on function private.fail_letter_job(uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function private.fail_letter_job(uuid,uuid,text) to service_role;
create function public.fail_letter_job(p_job uuid,p_lease uuid,p_error text) returns void
language sql security invoker set search_path='' as $$
 select private.fail_letter_job(p_job,p_lease,p_error);
$$;
revoke all on function public.fail_letter_job(uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.fail_letter_job(uuid,uuid,text) to service_role;

commit;
