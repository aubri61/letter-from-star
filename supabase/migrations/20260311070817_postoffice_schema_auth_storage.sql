begin;
create table public.cats (
 id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users on delete cascade,
 name text not null check (length(trim(name)) between 1 and 30), personality text not null default '' check(length(personality)<=500),
 favorites text not null default '' check(length(favorites)<=500), memories text not null default '' check(length(memories)<=3000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id)
);
create table public.cat_photos (
 id uuid primary key default gen_random_uuid(), cat_id uuid not null references public.cats on delete cascade,
 storage_path text not null unique, is_primary boolean not null default false,
 sort_order integer not null check(sort_order between 0 and 4), created_at timestamptz not null default now(), unique(cat_id,sort_order)
);
create unique index cat_one_primary on public.cat_photos(cat_id) where is_primary;
create table public.letters (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 cat_id uuid not null, direction text not null check(direction in ('TO_CAT','FROM_CAT')),
 title text not null check(length(trim(title)) between 1 and 80), content text not null check(length(trim(content)) between 1 and 3000),
 status text not null default 'delivered' check(status='delivered'), delivery_date date, scheduled_at timestamptz,
 read_at timestamptz, created_at timestamptz not null default now(), request_id uuid,
 foreign key(cat_id,user_id) references public.cats(id,user_id) on delete cascade,
 check((direction='FROM_CAT' and delivery_date is not null and request_id is null) or (direction='TO_CAT' and delivery_date is null and request_id is not null)),
 unique(user_id,request_id)
);
create unique index one_daily_reply on public.letters(cat_id,delivery_date) where direction='FROM_CAT';
create index letters_user_created on public.letters(user_id,created_at desc);
create table public.letter_jobs (
 id uuid primary key default gen_random_uuid(), cat_id uuid not null references public.cats on delete cascade,
 delivery_date date not null, status text not null default 'pending' check(status in ('pending','processing','completed','failed')),
 attempt_count integer not null default 0 check(attempt_count between 0 and 3), last_error text,
 lease_token uuid, started_at timestamptz, completed_at timestamptz, created_at timestamptz not null default now(), unique(cat_id,delivery_date)
);
create index jobs_claim on public.letter_jobs(status,delivery_date,started_at);
create table public.user_preferences (
 user_id uuid primary key references auth.users on delete cascade, daily_letters_enabled boolean not null default false,
 timezone text not null default 'Asia/Seoul' check(timezone='Asia/Seoul'), delivery_hour integer not null default 9 check(delivery_hour=9),
 updated_at timestamptz not null default now()
);
create function public.touch_updated_at() returns trigger language plpgsql set search_path='' as $$begin new.updated_at=now(); return new; end;$$;
create trigger cats_updated before update on public.cats for each row execute function public.touch_updated_at();
create trigger preferences_updated before update on public.user_preferences for each row execute function public.touch_updated_at();
alter table public.cats enable row level security;
alter table public.cat_photos enable row level security;
alter table public.letters enable row level security;
alter table public.letter_jobs enable row level security;
alter table public.user_preferences enable row level security;
create policy own_cats on public.cats for select to authenticated using(user_id=(select auth.uid()));
create policy own_photos on public.cat_photos for select to authenticated using(exists(select 1 from public.cats c where c.id=cat_id and c.user_id=(select auth.uid())));
create policy own_letters on public.letters for select to authenticated using(user_id=(select auth.uid()));
create policy own_jobs on public.letter_jobs for select to authenticated using(exists(select 1 from public.cats c where c.id=cat_id and c.user_id=(select auth.uid())));
create policy own_preferences_select on public.user_preferences for select to authenticated using(user_id=(select auth.uid()));
create policy own_preferences_insert on public.user_preferences for insert to authenticated with check(user_id=(select auth.uid()));
create policy own_preferences_update on public.user_preferences for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
revoke all on public.cats,public.cat_photos,public.letters,public.letter_jobs,public.user_preferences from anon,authenticated;
grant select on public.cats,public.cat_photos,public.letters,public.letter_jobs,public.user_preferences to authenticated;
grant insert(user_id,daily_letters_enabled),update(daily_letters_enabled) on public.user_preferences to authenticated;
grant all on public.cats,public.cat_photos,public.letters,public.letter_jobs,public.user_preferences to service_role;

create function public.save_cat(p_name text,p_personality text,p_favorites text,p_memories text,p_paths text[],p_primary integer)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid=auth.uid(); v_cat uuid; v_path text; v_i integer=0;
begin
 if v_user is null then raise exception 'authentication required'; end if;
 if coalesce(cardinality(p_paths),0) not between 1 and 5 or p_primary is null or p_primary<0 or p_primary>=cardinality(p_paths) or cardinality(p_paths)<>(select count(distinct p) from unnest(p_paths) p) then raise exception 'invalid photos'; end if;
 insert into public.cats(user_id,name,personality,favorites,memories) values(v_user,p_name,p_personality,p_favorites,p_memories)
 on conflict(user_id) do update set name=excluded.name,personality=excluded.personality,favorites=excluded.favorites,memories=excluded.memories returning id into v_cat;
 foreach v_path in array p_paths loop
  if v_path is null or split_part(v_path,'/',1)<>v_user::text or not exists(select 1 from storage.objects where bucket_id='cat-photos' and name=v_path) then raise exception 'invalid photo owner'; end if;
 end loop;
 delete from public.cat_photos where cat_id=v_cat;
 foreach v_path in array p_paths loop
  insert into public.cat_photos(cat_id,storage_path,is_primary,sort_order) values(v_cat,v_path,v_i=p_primary,v_i); v_i=v_i+1;
 end loop;
 return v_cat;
end;$$;
create function public.delete_cat() returns void language plpgsql security definer set search_path='' as $$begin if auth.uid() is null then raise exception 'authentication required'; end if; delete from public.cats where user_id=auth.uid(); update public.user_preferences set daily_letters_enabled=false where user_id=auth.uid(); end;$$;
create function public.send_letter(p_request_id uuid,p_title text,p_content text) returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid=auth.uid(); v_cat uuid; v_id uuid; v_first boolean;
begin
 if v_user is null or p_request_id is null then raise exception 'authentication required'; end if;
 select id into v_cat from public.cats where user_id=v_user for update;
 if v_cat is null then raise exception 'cat required'; end if;
 select id into v_id from public.letters where user_id=v_user and request_id=p_request_id;
 if v_id is not null then return v_id; end if;
 select not exists(select 1 from public.letters where cat_id=v_cat and direction='TO_CAT') into v_first;
 insert into public.letters(user_id,cat_id,direction,title,content,request_id,read_at) values(v_user,v_cat,'TO_CAT',p_title,p_content,p_request_id,now()) returning id into v_id;
 if v_first then insert into public.user_preferences(user_id,daily_letters_enabled) values(v_user,true) on conflict(user_id) do update set daily_letters_enabled=true; end if;
 return v_id;
end;$$;
create function public.mark_letter_read(p_id uuid) returns void language plpgsql security definer set search_path='' as $$begin
 update public.letters set read_at=coalesce(read_at,now()) where id=p_id and user_id=auth.uid() and direction='FROM_CAT';
end;$$;
revoke all on function public.save_cat(text,text,text,text,text[],integer),public.send_letter(uuid,text,text),public.mark_letter_read(uuid),public.delete_cat() from public,anon;
grant execute on function public.save_cat(text,text,text,text,text[],integer),public.send_letter(uuid,text,text),public.mark_letter_read(uuid),public.delete_cat() to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('cat-photos','cat-photos',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy own_photo_read on storage.objects for select to authenticated using(bucket_id='cat-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy own_photo_upload on storage.objects for insert to authenticated with check(bucket_id='cat-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy own_photo_delete on storage.objects for delete to authenticated using(bucket_id='cat-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
-- Only user-owned delivered letters are visible through RLS to Realtime subscribers.
alter publication supabase_realtime add table public.letters;
commit;
