\set ON_ERROR_STOP on
insert into auth.users values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
insert into storage.objects(bucket_id,name) values('cat-photos','11111111-1111-4111-8111-111111111111/cat.jpg');
select public.save_cat('별이','다정함','햇살','함께한 오후',array['11111111-1111-4111-8111-111111111111/cat.jpg'],0);
select public.send_letter('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','안녕','보고 싶어');
select public.send_letter('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','안녕','보고 싶어');
do $$begin
 if (select count(*) from public.letters)<>1 then raise exception 'idempotency failed'; end if;
 if not (select daily_letters_enabled from public.user_preferences) then raise exception 'first send subscription failed'; end if;
 begin insert into public.letters(user_id,cat_id,direction,title,content,delivery_date) select user_id,id,'FROM_CAT','forged','forged',current_date from public.cats; raise exception 'client FROM_CAT insert allowed'; exception when insufficient_privilege then null; end;
 begin update public.letters set content='tampered';raise exception 'client letter update allowed';exception when insufficient_privilege then null;end;
 begin perform public.claim_letter_jobs(3);raise exception 'client job claim allowed';exception when insufficient_privilege then null;end;
 begin perform public.save_cat('별이','','','',array['11111111-1111-4111-8111-111111111111/cat.jpg','11111111-1111-4111-8111-111111111111/cat.jpg'],0);raise exception 'duplicate photo allowed';exception when raise_exception then if sqlerrm='duplicate photo allowed' then raise;end if;end;
end;$$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$begin
 if (select count(*) from public.cats)<>0 or (select count(*) from public.letters)<>0 or (select count(*) from public.cat_photos)<>0 or (select count(*) from storage.objects)<>0 then raise exception 'cross-user leak';end if;
 begin perform public.save_cat('달이','','','',array['11111111-1111-4111-8111-111111111111/cat.jpg'],0);raise exception 'cross-user photo accepted';exception when raise_exception then if sqlerrm='cross-user photo accepted' then raise;end if;end;
 begin insert into storage.objects(bucket_id,name) values('cat-photos','11111111-1111-4111-8111-111111111111/bad.jpg');raise exception 'cross-user upload allowed';exception when insufficient_privilege then null;end;
end;$$;
reset role;
-- Make the first sent letter eligible before today's delivery cutoff.
update public.letters set created_at='2025-01-14T00:00:00Z' where direction='TO_CAT';
set role anon;
do $$begin begin perform * from public.cats;raise exception 'anonymous read allowed';exception when insufficient_privilege then null;end;end;$$;
reset role;
