begin;

alter table public.letters add column reply_to_letter_id uuid references public.letters(id) on delete cascade;
do $$ declare v_name text; begin
  select conname into v_name from pg_constraint
  where conrelid='public.letters'::regclass and contype='c'
    and pg_get_constraintdef(oid) like '%delivery_date%'
    and pg_get_constraintdef(oid) like '%request_id%';
  if v_name is null then raise exception 'Letter delivery constraint not found'; end if;
  execute format('alter table public.letters drop constraint %I',v_name);
end $$;
alter table public.letters add constraint letters_delivery_mode check (
  (direction='TO_CAT' and delivery_date is null and request_id is not null and reply_to_letter_id is null)
  or (direction='FROM_CAT' and request_id is null and (
    (delivery_date is not null and reply_to_letter_id is null)
    or (delivery_date is null and reply_to_letter_id is not null)
  ))
);
create unique index one_instant_reply on public.letters(reply_to_letter_id) where reply_to_letter_id is not null;

create table private.instant_reply_requests (
  source_letter_id uuid primary key references public.letters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check(status in ('processing','completed','failed')),
  attempt_count integer not null default 1 check(attempt_count between 1 and 3),
  lease_token uuid, started_at timestamptz not null default now(),
  reply_id uuid references public.letters(id) on delete set null
);
create index instant_reply_user_started on private.instant_reply_requests(user_id,started_at);
create index instant_reply_result on private.instant_reply_requests(reply_id);
alter table private.instant_reply_requests enable row level security;
revoke all on private.instant_reply_requests from public,anon,authenticated;
grant select,insert,update on private.instant_reply_requests to service_role;

create function private.claim_instant_reply(p_user uuid,p_source uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_cat uuid; v_request private.instant_reply_requests; v_lease uuid;
begin
  select cat_id into v_cat from public.letters where id=p_source and user_id=p_user and direction='TO_CAT';
  if v_cat is null then return jsonb_build_object('status','missing'); end if;
  perform 1 from public.cats where id=v_cat and user_id=p_user for update;
  if not found then return jsonb_build_object('status','missing'); end if;
  select * into v_request from private.instant_reply_requests where source_letter_id=p_source for update;
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
      where user_id=p_user and started_at>=((now() at time zone 'Asia/Seoul')::date::timestamp at time zone 'Asia/Seoul'))>=5
    or exists(select 1 from private.instant_reply_requests where user_id=p_user and status='processing' and started_at>now()-interval '2 minutes') then
    return jsonb_build_object('status','limited');
  end if;
  v_lease=gen_random_uuid();
  insert into private.instant_reply_requests(source_letter_id,user_id,status,lease_token)
    values(p_source,p_user,'processing',v_lease)
    on conflict(source_letter_id) do update set status='processing',lease_token=v_lease,
      started_at=now(),attempt_count=instant_reply_requests.attempt_count+1;
  return jsonb_build_object('status','claimed','lease_token',v_lease);
end; $$;

create function private.finish_instant_reply(p_user uuid,p_source uuid,p_lease uuid,p_title text,p_content text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_cat uuid; v_request private.instant_reply_requests; v_reply uuid;
begin
  select cat_id into v_cat from public.letters where id=p_source and user_id=p_user and direction='TO_CAT';
  perform 1 from public.cats where id=v_cat and user_id=p_user for update;
  if not found then return null; end if;
  select * into v_request from private.instant_reply_requests
    where source_letter_id=p_source and user_id=p_user and status='processing' and lease_token=p_lease for update;
  if not found or v_request.started_at<now()-interval '2 minutes' then return null; end if;
  if p_title is null or p_content is null then
    update private.instant_reply_requests set status='failed',lease_token=null where source_letter_id=p_source;
    return null;
  end if;
  if length(trim(p_title)) not between 1 and 80 or length(trim(p_content)) not between 100 and 1500 then
    raise exception 'Invalid generated reply';
  end if;
  insert into public.letters(user_id,cat_id,direction,title,content,reply_to_letter_id,scheduled_at)
    values(p_user,v_cat,'FROM_CAT',p_title,p_content,p_source,now()) returning id into v_reply;
  update private.instant_reply_requests set status='completed',lease_token=null,reply_id=v_reply where source_letter_id=p_source;
  return v_reply;
end; $$;

create function public.claim_instant_reply(p_user uuid,p_source uuid) returns jsonb
language sql security invoker set search_path='' as $$ select private.claim_instant_reply(p_user,p_source); $$;
create function public.finish_instant_reply(p_user uuid,p_source uuid,p_lease uuid,p_title text,p_content text) returns uuid
language sql security invoker set search_path='' as $$ select private.finish_instant_reply(p_user,p_source,p_lease,p_title,p_content); $$;
revoke all on function private.claim_instant_reply(uuid,uuid),private.finish_instant_reply(uuid,uuid,uuid,text,text),
  public.claim_instant_reply(uuid,uuid),public.finish_instant_reply(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function private.claim_instant_reply(uuid,uuid),private.finish_instant_reply(uuid,uuid,uuid,text,text),
  public.claim_instant_reply(uuid,uuid),public.finish_instant_reply(uuid,uuid,uuid,text,text) to service_role;
commit;
