#!/usr/bin/env bash
# Boot portable PostgreSQL for madarek dev (mirrors previous session's tools/pgsql setup)
set -e
TOOLS=/home/z/my-project/madarek/tools
PGBIN="$TOOLS/node_modules/@embedded-postgres/linux-x64/native/bin"
PGDATA="$TOOLS/pgdata"
SOCK="$TOOLS/pgsock"
PORT=5433

if [ -f "$SOCK/.ready" ]; then echo "PG already running on $PORT"; exit 0; fi
mkdir -p "$SOCK" && rm -rf "$SOCK"/*

if [ ! -f "$PGDATA/PG_VERSION" ]; then
  rm -rf "$PGDATA" && mkdir -p "$PGDATA"
  "$PGBIN/initdb" -D "$PGDATA" -U madarek --auth=trust -E UTF8 >/dev/null
fi

"$PGBIN/pg_ctl" -D "$PGDATA" -o "-p $PORT -k $SOCK -c listen_addresses=127.0.0.1" -l "$TOOLS/pg.log" start
for i in $(seq 1 20); do
  "$PGBIN/pg_isready" -h 127.0.0.1 -p $PORT -q && { touch "$SOCK/.ready"; echo "PG ready on 127.0.0.1:$PORT"; exit 0; }
  sleep 0.5
done
echo "PG failed to start"; tail -5 "$TOOLS/pg.log"; exit 1
