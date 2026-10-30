begin;
alter table public.letters add column ai_provider text check(ai_provider in ('groq','gemini'));
alter table public.letters add column ai_model text check(length(ai_model)<=120);
update public.letters set ai_provider='groq' where reply_to_letter_id is not null;
alter table private.instant_reply_requests add column provider text not null default 'groq' check(provider in ('groq','gemini'));
alter table private.instant_reply_requests drop constraint instant_reply_requests_pkey;
alter table private.instant_reply_requests add primary key(source_letter_id,provider);
drop index public.one_instant_reply;
create unique index one_instant_reply_per_provider on public.letters(reply_to_letter_id,ai_provider) where reply_to_letter_id is not null;
alter table public.letters add constraint instant_reply_provider_required check(reply_to_letter_id is null or ai_provider is not null);

create function private.claim_instant_reply(p_user uuid,p_source uuid,p_provider text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_cat uuid; v_request private.instant_reply_requests; v_lease uuid;
begin
  if p_provider not in ('groq','gemini') or p_provider is null then raise exception 'Unsupported provider'; end if;
  select cat_id into v_cat from public.letters where id=p_source and user_id=p_user and direction='TO_CAT';
  if v_cat is null then return jsonb_build_object('status','missing'); end if;
  perform 1 from public.cats where id=v_cat and user_id=p_user for update;
  if not found then return jsonb_build_object('status','missing'); end if;
  select * into v_request from private.instant_reply_requests where source_letter_id=p_source and provider=p_provider for update;
  if found then
    if v_request.status='completed' and v_request.reply_id is not null then
      return jsonb_build_object('status','completed','reply_id',v_request.reply_id);
    end if;
    if v_request.status='processing' and v_request.started_at>now()-interval '2 minutes' then
      return jsonb_build_object('status','processing');
    end if;
    if v_request.attempt_count>=3 or v_request.started_at>now()-interval '30 seconds' then
      return jsonb_build_object('status','limited');
    end if;
  end if;
  if (select coalesce(sum(attempt_count),0) from private.instant_reply_requests
      where user_id=p_user and provider=p_provider and started_at>=((now() at time zone 'Asia/Seoul')::date::timestamp at time zone 'Asia/Seoul'))>=5
    or exists(select 1 from private.instant_reply_requests where user_id=p_user and status='processing' and started_at>now()-interval '2 minutes') then
    return jsonb_build_object('status','limited');
  end if;
  v_lease=gen_random_uuid();
  insert into private.instant_reply_requests(source_letter_id,user_id,status,lease_token,provider)
    values(p_source,p_user,'processing',v_lease,p_provider)
    on conflict(source_letter_id,provider) do update set status='processing',lease_token=v_lease,
      started_at=now(),attempt_count=instant_reply_requests.attempt_count+1;
  return jsonb_build_object('status','claimed','lease_token',v_lease);
end; $$;

create function private.finish_instant_reply(p_user uuid,p_source uuid,p_lease uuid,p_title text,p_content text,p_provider text,p_model text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_cat uuid; v_request private.instant_reply_requests; v_reply uuid;
begin
  if p_provider not in ('groq','gemini') or p_provider is null then raise exception 'Unsupported provider'; end if;
  select cat_id into v_cat from public.letters where id=p_source and user_id=p_user and direction='TO_CAT';
  perform 1 from public.cats where id=v_cat and user_id=p_user for update;
  if not found then return null; end if;
  select * into v_request from private.instant_reply_requests
    where source_letter_id=p_source and user_id=p_user and provider=p_provider and status='processing' and lease_token=p_lease for update;
  if not found or v_request.started_at<now()-interval '2 minutes' then return null; end if;
  if p_title is null or p_content is null then
    update private.instant_reply_requests set status='failed',lease_token=null where source_letter_id=p_source and provider=p_provider;
    return null;
  end if;
  if length(trim(p_title)) not between 1 and 80 or length(trim(p_content)) not between 100 and 1500 then
    raise exception 'Invalid generated reply';
  end if;
  insert into public.letters(user_id,cat_id,direction,title,content,reply_to_letter_id,scheduled_at,ai_provider,ai_model)
    values(p_user,v_cat,'FROM_CAT',p_title,p_content,p_source,now(),p_provider,left(p_model,120)) returning id into v_reply;
  update private.instant_reply_requests set status='completed',lease_token=null,reply_id=v_reply where source_letter_id=p_source and provider=p_provider;
  return v_reply;
end; $$;


create function public.claim_instant_reply(p_user uuid,p_source uuid,p_provider text) returns jsonb
language sql security invoker set search_path='' as $$ select private.claim_instant_reply(p_user,p_source,p_provider); $$;
create function public.finish_instant_reply(p_user uuid,p_source uuid,p_lease uuid,p_title text,p_content text,p_provider text,p_model text) returns uuid
language sql security invoker set search_path='' as $$ select private.finish_instant_reply(p_user,p_source,p_lease,p_title,p_content,p_provider,p_model); $$;

-- Preserve the original Groq RPC signatures for callers still using the previous version.
create or replace function private.claim_instant_reply(p_user uuid,p_source uuid) returns jsonb
language sql security invoker set search_path='' as $$ select private.claim_instant_reply(p_user,p_source,'groq'); $$;
create or replace function private.finish_instant_reply(p_user uuid,p_source uuid,p_lease uuid,p_title text,p_content text) returns uuid
language sql security invoker set search_path='' as $$ select private.finish_instant_reply(p_user,p_source,p_lease,p_title,p_content,'groq',null); $$;
revoke all on function private.claim_instant_reply(uuid,uuid,text),private.finish_instant_reply(uuid,uuid,uuid,text,text,text,text),
 public.claim_instant_reply(uuid,uuid,text),public.finish_instant_reply(uuid,uuid,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function private.claim_instant_reply(uuid,uuid,text),private.finish_instant_reply(uuid,uuid,uuid,text,text,text,text),
 public.claim_instant_reply(uuid,uuid,text),public.finish_instant_reply(uuid,uuid,uuid,text,text,text,text) to service_role;
commit;
