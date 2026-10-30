-- MANUAL OPT-IN ONLY. Apply after migrations, worker deployment and Vault secrets.
-- No secrets belong in this file. Create project_url and letter_cron_secret in Vault UI.
-- 00:00 UTC = 09:00 KST. Every five minutes afterwards drains bounded batches/retries.
-- This window supports ~540 cats/day at batch=3; monitor backlog before increasing volume.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
select cron.schedule('letter-from-star-delivery', '*/5 0-14 * * *', $$
 select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name='project_url') || '/functions/v1/daily-letters',
  headers := jsonb_build_object('Content-Type','application/json','x-letter-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='letter_cron_secret')),
  body := '{}'::jsonb, timeout_milliseconds := 150000
 );
$$);
-- Stop: select cron.unschedule('letter-from-star-delivery');
