#!/usr/bin/env bash
# Create or update a rolling GitHub Release and upload verified assets.
#
# Usage:
#   publish-rolling-release.sh TAG TITLE NOTES_FILE COMMIT ASSET...
#
# Requires GH_TOKEN (or a logged-in gh CLI) and GITHUB_REPOSITORY.
# The release is always a prerelease so it never replaces the repository's
# "Latest" release. Assets are uploaded with --clobber, so the stable
# download URL is stable across builds.
#
# R355 A — the rolling-release law, learned from the 2026-11-15 outage
# (android-latest AND sidestore-latest left with zero assets while the
# publish job stayed green):
#   1. UPLOAD first, PRUNE second — never the other way round. The
#      window where the release could be empty must only ever shrink.
#   2. The prune compares asset BASENAMES (`Madarek.apk`), never the
#      local paths (`verified/Madarek.apk`). The R353 R1 purge compared
#      paths to names, matched nothing, and deleted every fresh asset.
#   3. The script ENDS with a hard assertion: the live release carries
#      EXACTLY this build's assets, each non-empty, or the script exits
#      non-zero. A publish that leaves the release empty is an outage
#      and must be loud, never "success".
set -euo pipefail

if [[ $# -lt 5 ]]; then
  echo "usage: $0 TAG TITLE NOTES_FILE COMMIT ASSET..." >&2
  exit 2
fi

TAG="$1"
TITLE="$2"
NOTES="$3"
COMMIT="$4"
shift 4

: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
: "${GH_TOKEN:?GH_TOKEN is required}"

command -v gh >/dev/null || { echo "missing command: gh" >&2; exit 1; }
[[ -f "$NOTES" ]] || { echo "missing release notes: $NOTES" >&2; exit 1; }
[[ -n "$COMMIT" ]] || { echo "missing commit" >&2; exit 1; }
for asset in "$@"; do
  [[ -f "$asset" ]] || { echo "missing asset: $asset" >&2; exit 1; }
done

# The expected asset names = the BASENAMES of the files we upload
# (`gh release upload` strips directories; the prune and the final
# assertion must speak the same language).
expected_names=()
for asset in "$@"; do
  expected_names+=("${asset##*/}")
done
expected_sorted="$(printf '%s\n' "${expected_names[@]}" | sort -u)"

echo "==> Release $TAG in $GITHUB_REPOSITORY at $COMMIT"
if gh release view "$TAG" --repo "$GITHUB_REPOSITORY" >/dev/null 2>&1; then
  echo "    release exists: updating title/notes"
  gh release edit "$TAG" \
    --repo "$GITHUB_REPOSITORY" \
    --title "$TITLE" \
    --notes-file "$NOTES"
else
  echo "    creating prerelease"
  gh release create "$TAG" \
    --repo "$GITHUB_REPOSITORY" \
    --target "$COMMIT" \
    --title "$TITLE" \
    --notes-file "$NOTES" \
    --prerelease \
    --latest=false
fi

echo "==> Uploading ${#} asset(s) with --clobber (upload BEFORE any prune)"
uploaded=0
for attempt in 1 2 3; do
  if gh release upload "$TAG" "$@" --repo "$GITHUB_REPOSITORY" --clobber; then
    uploaded=1
    break
  fi
  echo "    upload attempt $attempt failed; retrying in 5s" >&2
  sleep 5
done
[[ "$uploaded" == "1" ]] || { echo "::error::release asset upload failed after 3 attempts — release left untouched" >&2; exit 1; }

# R355 A — verify the upload LANDED before pruning anything: every
# expected asset must exist on the release, non-empty. If the upload
# silently no-opped, we fail HERE — while the release still carries
# its previous assets — instead of pruning first and ending up empty.
echo "==> Verifying the upload landed (every expected asset present, non-empty)"
live_json="$(gh release view "$TAG" --repo "$GITHUB_REPOSITORY" --json assets --jq '.assets[] | [.name, .size] | @tsv')"
upload_ok=1
while read -r want; do
  [[ -z "$want" ]] && continue
  line="$(printf '%s\n' "$live_json" | awk -F'\t' -v w="$want" '$1 == w' | head -1)"
  if [[ -z "$line" ]]; then
    echo "::error::uploaded asset did not land on the release: $want" >&2
    upload_ok=0
  elif [[ "$(printf '%s' "$line" | awk -F'\t' '{print $2}')" -le 0 ]]; then
    echo "::error::uploaded asset has size 0: $want" >&2
    upload_ok=0
  fi
done <<< "$expected_sorted"
[[ "$upload_ok" == "1" ]] || { echo "::error::upload verification failed — previous assets left untouched, nothing purged" >&2; exit 1; }

# R353 R1 (rewritten R355 A) — PRUNE stale assets AFTER a successful,
# verified upload: any asset whose BASENAME is not part of this upload
# is deleted (e.g. a legacy Madarek.aab that --clobber never touches).
# The release must mirror exactly what this run built — nothing more.
echo "==> Pruning assets not in this build's upload list (by basename)"
while read -r name; do
  [[ -z "$name" ]] && continue
  if printf '%s\n' "$expected_sorted" | grep -qxF "$name"; then
    echo "    keep asset: $name"
  else
    echo "    purge stale asset: $name (not in this build's upload list)"
    purged=0
    for attempt in 1 2 3; do
      if gh release delete-asset "$TAG" "$name" --repo "$GITHUB_REPOSITORY" --yes; then
        purged=1
        break
      fi
      echo "    delete-asset attempt $attempt failed; retrying in 5s" >&2
      sleep 5
    done
    [[ "$purged" == "1" ]] || { echo "::error::failed to purge stale asset: $name" >&2; exit 1; }
  fi
done < <(gh release view "$TAG" --repo "$GITHUB_REPOSITORY" --json assets --jq '.assets[].name')

# R355 A — THE HARD ASSERTION: the publish is only a success when the
# live release ends with EXACTLY this build's assets, each non-empty.
# This is the guard that would have caught the 2026-11-15 outage (all
# four fresh assets purged by the path-vs-basename bug, job still green).
echo "==> Verifying the final release state (exactly this build's assets, non-empty)"
final_json="$(gh release view "$TAG" --repo "$GITHUB_REPOSITORY" --json assets --jq '.assets[] | [.name, .size] | @tsv')"
[[ -n "$final_json" ]] || { echo "::error::release $TAG has NO assets after publish — refusing to report success" >&2; exit 1; }

failed=0
while read -r name size; do
  [[ -z "$name" ]] && continue
  if ! printf '%s\n' "$expected_sorted" | grep -qxF "$name"; then
    echo "::error::unexpected asset survived the prune: $name" >&2
    failed=1
  fi
  if [[ "$size" -le 0 ]]; then
    echo "::error::asset has size 0: $name" >&2
    failed=1
  fi
done <<< "$final_json"

while read -r want; do
  [[ -z "$want" ]] && continue
  if ! printf '%s\n' "$final_json" | awk -F'\t' '{print $1}' | grep -qxF "$want"; then
    echo "::error::expected asset missing from the release: $want" >&2
    failed=1
  fi
done <<< "$expected_sorted"

[[ "$failed" == "0" ]] || { echo "::error::final release state is wrong — see the errors above" >&2; exit 1; }

url="$(gh release view "$TAG" --repo "$GITHUB_REPOSITORY" --json url --jq .url)"
echo "RELEASE_URL=$url"
gh release view "$TAG" --repo "$GITHUB_REPOSITORY" \
  --json tagName,name,isPrerelease,url,assets \
  --jq '{tagName,name,isPrerelease,url,assets:[.assets[]|{name,size,url}]}'
echo "==> Publish verified: exactly this build's assets are live."
