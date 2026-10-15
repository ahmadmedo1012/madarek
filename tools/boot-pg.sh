#!/usr/bin/env bash
# Boot portable PostgreSQL for madarek dev (mirrors previous session's tools/pgsql setup)
set -e
# Resolve tools/ from the script's own location (works from any checkout path).
TOOLS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
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

# Readiness probe (r166c): the pinned @embedded-postgres/linux-x64 does NOT
# ship pg_isready — its native/bin contains only initdb/pg_ctl/postgres
# (verified against the installed package in the r166-E3 audit), so the old
# `pg_isready` loop could never succeed. Probe the TCP port directly with
# node's net module instead: node is a prerequisite of this script anyway
# (the embedded binaries are npm-installed into tools/node_modules).
# Verified by construction — the probe snippet itself was tested standalone
# (listener up → exit 0, nothing listening → exit 1); a full boot was not
# exercised in this sandbox (no embedded PG binaries installed here).
for i in $(seq 1 20); do
  if PG_PROBE_PORT="$PORT" node -e '
    const net = require("node:net");
    const sock = net.connect(
      { host: "127.0.0.1", port: Number(process.env.PG_PROBE_PORT) },
      () => { sock.end(); process.exit(0); },
    );
    sock.on("error", () => process.exit(1));
    setTimeout(() => { sock.destroy(); process.exit(1); }, 2000);
  ' >/dev/null 2>&1; then
    touch "$SOCK/.ready"; echo "PG ready on 127.0.0.1:$PORT"; exit 0
  fi
  sleep 0.5
done
echo "PG failed to start"; tail -5 "$TOOLS/pg.log"; exit 1
