begin;
-- Called only by the worker. A lease token fences late workers after crash recovery.
create function public.claim_letter_jobs(p_limit integer default 3, p_now timestamptz default now())
returns setof public.letter_jobs language plpgsql security definer set search_path='' as $$
declare v_today date=(p_now at time zone 'Asia/Seoul')::date; v_cutoff timestamptz;
begin
 v_cutoff=(v_today+time '09:00') at time zone 'Asia/Seoul';
 -- Expired final attempts must not remain "processing" forever.
 update public.letter_jobs set status='failed',lease_token=null,last_error='lease_expired'
 where status='processing' and attempt_count>=3 and started_at<p_now-interval '10 minutes';
 update public.letter_jobs set status='failed',lease_token=null,last_error='delivery_window_expired',attempt_count=3
 where delivery_date<v_today and status in ('pending','processing','failed');
 if p_now<v_cutoff then return; end if;
 insert into public.letter_jobs(cat_id,delivery_date)
 select c.id,v_today from public.cats c join public.user_preferences p on p.user_id=c.user_id and p.daily_letters_enabled
 where exists(select 1 from public.letters l where l.cat_id=c.id and l.direction='TO_CAT' and l.created_at<v_cutoff)
 and not exists(select 1 from public.letters l where l.cat_id=c.id and l.direction='FROM_CAT' and l.delivery_date=v_today)
 on conflict(cat_id,delivery_date) do nothing;
 return query
 with candidates as (
  select j.id from public.letter_jobs j join public.cats c on c.id=j.cat_id join public.user_preferences p on p.user_id=c.user_id and p.daily_letters_enabled
  where j.delivery_date=v_today and j.attempt_count<3 and (j.status='pending' or (j.status='failed' and j.started_at<p_now-interval '5 minutes') or (j.status='processing' and j.started_at<p_now-interval '10 minutes'))
  order by j.created_at limit greatest(1,least(p_limit,3)) for update of j skip locked
 ) update public.letter_jobs j set status='processing',attempt_count=j.attempt_count+1,started_at=p_now,lease_token=gen_random_uuid(),last_error=null
 from candidates where j.id=candidates.id returning j.*;
end;$$;
create function public.finish_letter_job(p_job uuid,p_lease uuid,p_title text,p_content text) returns boolean language plpgsql security definer set search_path='' as $$
declare v_job public.letter_jobs; v_user uuid;
begin
 select * into v_job from public.letter_jobs where id=p_job and lease_token=p_lease and status='processing' for update;
 if not found then return false; end if;
 select user_id into v_user from public.cats where id=v_job.cat_id;
 if not exists(select 1 from public.user_preferences where user_id=v_user and daily_letters_enabled) then
  update public.letter_jobs set status='failed',last_error='delivery disabled',attempt_count=3 where id=p_job; return false;
 end if;
 insert into public.letters(user_id,cat_id,direction,title,content,delivery_date,scheduled_at)
 values(v_user,v_job.cat_id,'FROM_CAT',p_title,p_content,v_job.delivery_date,(v_job.delivery_date+time '09:00') at time zone 'Asia/Seoul')
 on conflict(cat_id,delivery_date) where direction='FROM_CAT' do nothing;
 update public.letter_jobs set status='completed',completed_at=now(),lease_token=null where id=p_job;
 return true;
end;$$;
create function public.fail_letter_job(p_job uuid,p_lease uuid,p_error text) returns void language sql security definer set search_path='' as $$
 update public.letter_jobs set status='failed',last_error=left(p_error,200),lease_token=null where id=p_job and lease_token=p_lease and status='processing';
$$;
revoke all on function public.claim_letter_jobs(integer,timestamptz),public.finish_letter_job(uuid,uuid,text,text),public.fail_letter_job(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.claim_letter_jobs(integer,timestamptz),public.finish_letter_job(uuid,uuid,text,text),public.fail_letter_job(uuid,uuid,text) to service_role;
commit;
