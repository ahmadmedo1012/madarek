#!/usr/bin/env bash
# publish-rolling-release.test.sh — R355 A regression test for the
# rolling-release publish logic (the 2026-11-15 outage: android-latest
# AND sidestore-latest left with zero assets while the publish job
# stayed green).
#
# What is asserted (the publish law):
#   P1  UPLOAD happens BEFORE any prune (upload-then-prune, never
#       prune-then-upload).
#   P2  The prune compares asset BASENAMES — assets uploaded from
#       paths (`verified/Madarek.apk`) are KEPT, only genuinely stale
#       names are purged. (The R353 R1 bug purged everything.)
#   P3  A publish that would leave the release without this build's
#       assets (or with size-0 / unexpected assets) FAILS LOUDLY
#       (non-zero exit) — never a green job over an empty release.
#   P4  A failed upload (3 attempts) exits non-zero WITHOUT running
#       the prune — the previous release is left untouched.
#
# Runs hermetically: `gh` is stubbed via PATH; no network, no tokens.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PUBLISH="$SCRIPT_DIR/publish-rolling-release.sh"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
GH_BIN="$WORK/bin"
STATE="$WORK/state"
OPS="$WORK/ops.log"
mkdir -p "$GH_BIN" "$STATE"

PASS=0
FAIL=0
ok()   { printf '  \033[32mPASS\033[0m %s\n' "$1"; PASS=$((PASS+1)); }
fail() { printf '  \033[31mFAIL\033[0m %s\n' "$1"; FAIL=$((FAIL+1)); }

# ── the gh stub ────────────────────────────────────────────────────────
# State: $STATE/<asset-name> files = the release's current assets.
# Ops:   every mutating command appends a line to $OPS.
# Env:   GH_STUB_UPLOAD_FAIL=1  -> `release upload` always fails.
#        GH_STUB_UPLOAD_DROP=1  -> `release upload` "succeeds" but adds
#                                  nothing (simulates a silent no-op
#                                  upload -> the release stays as-is).
#        GH_STUB_ZERO_SIZE=1    -> uploaded assets get size 0.
cat > "$GH_BIN/gh" <<'STUB'
#!/usr/bin/env bash
# minimal gh stub for publish-rolling-release.sh tests
STATE="${GH_STUB_STATE:?}"
OPS="${GH_STUB_OPS:?}"
cmd="$1"; shift
case "$cmd" in
  release)
    sub="$1"; shift
    tag=""; repo=""
    args=()
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --repo) repo="$2"; shift 2 ;;
        *) args+=("$1"); shift ;;
      esac
    done
    set -- "${args[@]}"
    tag="$1"; shift
    case "$sub" in
      view)
        # remaining args may include --json/--jq; find them
        json=""; jq=""
        while [[ $# -gt 0 ]]; do
          case "$1" in
            --json) json="$2"; shift 2 ;;
            --jq)   jq="$2"; shift 2 ;;
            *) shift ;;
          esac
        done
        if [[ ! -f "$STATE/.__exists__" ]]; then
          echo "gh: release not found: $tag" >&2
          exit 1
        fi
        case "$jq" in
          '.assets[].name')
            for f in "$STATE"/*; do
              [[ -f "$f" ]] || continue
              b="$(basename "$f")"
              [[ "$b" == __* ]] && continue
              echo "$b"
            done
            ;;
          '.assets[] | [.name, .size] | @tsv')
            for f in "$STATE"/*; do
              [[ -f "$f" ]] || continue
              b="$(basename "$f")"
              [[ "$b" == __* ]] && continue
              printf '%s\t%s\n' "$b" "$(stat -c%s "$f")"
            done
            ;;
          .url) echo "https://stub.github.invalid/r/release/$tag" ;;
          '{tagName,name,isPrerelease,url,assets:[.assets[]|{name,size,url}]}')
            echo '{"tagName":"stub","assets":[]}' ;;
          *) [[ -n "$json" ]] && echo '[]' || true ;;
        esac
        ;;
      create)
        touch "$STATE/.__exists__"
        echo "release-create $tag" >> "$OPS"
        ;;
      edit)
        echo "release-edit $tag" >> "$OPS"
        ;;
      upload)
        echo "release-upload $tag" >> "$OPS"
        if [[ "${GH_STUB_UPLOAD_FAIL:-0}" == "1" ]]; then
          echo "gh: upload failed (stub)" >&2
          exit 1
        fi
        if [[ "${GH_STUB_UPLOAD_DROP:-0}" != "1" ]]; then
          while [[ $# -gt 0 ]]; do
            [[ "$1" == --* ]] && { shift; continue; }
            [[ -f "$1" ]] || { echo "gh: no such file: $1" >&2; exit 1; }
            b="$(basename "$1")"
            cp "$1" "$STATE/$b"
            if [[ "${GH_STUB_ZERO_SIZE:-0}" == "1" ]]; then
              : > "$STATE/$b"
            fi
            shift
          done
        fi
        ;;
      delete-asset)
        name=""
        while [[ $# -gt 0 ]]; do
          [[ "$1" == --* ]] && { shift; continue; }
          name="$1"; break
        done
        echo "release-delete-asset $tag $name" >> "$OPS"
        rm -f "$STATE/$name"
        ;;
      *) echo "gh stub: unhandled release subcommand: $sub" >&2; exit 9 ;;
    esac
    ;;
  *) echo "gh stub: unhandled command: $cmd" >&2; exit 9 ;;
esac
STUB
chmod +x "$GH_BIN/gh"

run_publish() {
  # run_publish <notes> <asset...>  — asset paths relative to $WORK
  PATH="$GH_BIN:$PATH" \
  GH_STUB_STATE="$STATE" GH_STUB_OPS="$OPS" \
  GITHUB_REPOSITORY="stub/repo" GH_TOKEN="stub-token" \
    bash "$PUBLISH" "rolling-latest" "Rolling title" "$1" "deadbeef" "${@:2}" \
      > "$WORK/out.log" 2> "$WORK/err.log"
}

assets_now() { ls -A "$STATE" | grep -v '^\.' | sort; }

# ── S1: happy path — stale purged, fresh (uploaded from PATHS) kept ────
echo "S1: upload-then-prune keeps basename-matched assets, purges stale"
printf 'notes\n' > "$WORK/notes.md"
mkdir -p "$WORK/verified"
printf 'apk-bytes'  > "$WORK/verified/Madarek.apk"
printf 'sums'       > "$WORK/verified/SHA256SUMS.txt"
printf '{"x":1}'    > "$WORK/verified/build-info.json"
printf '{"y":1}'    > "$WORK/verified/verify.json"
# the release pre-exists with a stale asset + an older fresh-named one
touch "$STATE/.__exists__"
printf 'old-aab' > "$STATE/Madarek.aab"
printf 'old'     > "$STATE/build-info.json"
if run_publish "$WORK/notes.md" \
     "$WORK/verified/Madarek.apk" "$WORK/verified/SHA256SUMS.txt" \
     "$WORK/verified/build-info.json" "$WORK/verified/verify.json"; then
  ok "S1 exit 0"
else
  fail "S1 exit non-zero"; sed 's/^/    /' "$WORK/err.log"
fi
now="$(assets_now)"
want="$(printf 'Madarek.apk\nSHA256SUMS.txt\nbuild-info.json\nverify.json')"
[[ "$now" == "$want" ]] && ok "S2 final assets == exactly this build's basenames (path-vs-basename bug dead)" \
                        || fail "S2 final assets wrong: got [$now]"
if grep -q '^release-upload ' "$OPS" && [[ "$(grep -n '^release-upload \|^release-delete-asset ' "$OPS" | head -1 | awk '{print $1, $2}')" == *upload* ]]; then
  ok "P1 upload ran before any delete-asset"
else
  fail "P1 ordering: upload must precede prune"
fi
grep -q '^release-delete-asset rolling-latest Madarek.aab$' "$OPS" \
  && ok "P2 stale Madarek.aab purged" || fail "P2 stale asset not purged"

# ── S3: silent no-op upload -> loud failure, previous assets INTACT ────
echo "S3: a publish that adds nothing fails loudly (the outage shape)"
: > "$OPS"
# the outage shape: the release carries only a STALE asset (e.g. the
# old AAB), and the upload silently adds nothing — the script must
# refuse to call that a success.
rm -f "$STATE"/Madarek.apk "$STATE"/SHA256SUMS.txt \
      "$STATE"/build-info.json "$STATE"/verify.json
printf 'old-aab' > "$STATE/Madarek.aab"
GH_STUB_UPLOAD_DROP=1 run_publish "$WORK/notes.md" \
     "$WORK/verified/Madarek.apk" "$WORK/verified/SHA256SUMS.txt" \
     "$WORK/verified/build-info.json" "$WORK/verified/verify.json"
rc=$?
if [[ $rc -ne 0 ]]; then
  ok "P3 empty/missing-asset publish exits non-zero (rc=$rc)"
else
  fail "P3 publish reported success over a release missing this build's assets"
fi
grep -qE 'did not land on the release|expected asset missing|NO assets' "$WORK/err.log" \
  && ok "P3 error names the missing assets" || { fail "P3 no actionable error"; sed 's/^/    /' "$WORK/err.log"; }
now="$(assets_now)"
[[ "$now" == "Madarek.aab" ]] && ok "P3 previous assets survived the failed publish" \
                        || fail "P3 failed publish damaged the release: [$now]"

# ── S4: upload failure -> non-zero, prune NEVER runs ───────────────────
echo "S4: failed upload leaves the release untouched"
: > "$OPS"
printf 'pre' > "$STATE/Madarek.apk"   # pretend an older APK is live
GH_STUB_UPLOAD_FAIL=1 run_publish "$WORK/notes.md" \
     "$WORK/verified/Madarek.apk" "$WORK/verified/SHA256SUMS.txt" \
     "$WORK/verified/build-info.json" "$WORK/verify_placeholder" 2>/dev/null
rc=$?
[[ $rc -ne 0 ]] && ok "P4 upload failure exits non-zero (rc=$rc)" || fail "P4 upload failure reported success"
if grep -q '^release-delete-asset ' "$OPS"; then
  fail "P4 prune ran despite failed upload"
else
  ok "P4 prune never ran — release untouched"
fi

# ── S5: size-0 asset -> loud failure ────────────────────────────────────
echo "S5: a size-0 asset fails the final assertion"
rm -f "$STATE"/* ; touch "$STATE/.__exists__"
: > "$OPS"
GH_STUB_ZERO_SIZE=1 run_publish "$WORK/notes.md" "$WORK/verified/Madarek.apk"
rc=$?
[[ $rc -ne 0 ]] && ok "P3 size-0 asset rejected (rc=$rc)" || fail "size-0 asset accepted"

echo
if [[ $FAIL -eq 0 ]]; then
  echo "publish-rolling-release.test.sh: ALL GREEN ($PASS assertions)"
  exit 0
else
  echo "publish-rolling-release.test.sh: $FAIL FAILURE(S) of $((PASS+FAIL))"
  exit 1
fi
