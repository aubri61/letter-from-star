#!/bin/sh
set -eu
PG_BIN="${PG_BIN:-/opt/homebrew/opt/postgresql@14/bin}"
TEST_DIR=$(mktemp -d /tmp/letter-star-db.XXXXXX)
TEST_PORT=55439
cleanup(){ "$PG_BIN/pg_ctl" -D "$TEST_DIR/data" stop -m immediate >/dev/null 2>&1 || true; }
trap cleanup EXIT INT TERM
"$PG_BIN/initdb" -D "$TEST_DIR/data" -A trust --no-locale >/dev/null
"$PG_BIN/pg_ctl" -D "$TEST_DIR/data" -l "$TEST_DIR/server.log" -o "-p $TEST_PORT -h 127.0.0.1 -k $TEST_DIR -c wal_level=logical" start >/dev/null
export PGHOST=127.0.0.1 PGPORT=$TEST_PORT PGDATABASE=postgres
psql -X -q -v ON_ERROR_STOP=1 -f tests/db-bootstrap.sql
for task_migration in supabase/migrations/*.sql; do
  psql -X -q -v ON_ERROR_STOP=1 -f "$task_migration"
done
psql -X -q -v ON_ERROR_STOP=1 -f tests/db-security.sql
node --import tsx --test --test-concurrency=1 tests/db/*.integration.ts
printf 'PASS: isolated PostgreSQL RLS, constraints, RPC and concurrent delivery tests\n'
