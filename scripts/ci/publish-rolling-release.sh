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

echo "==> Uploading ${#} asset(s) with --clobber"
uploaded=0
for attempt in 1 2 3; do
  if gh release upload "$TAG" "$@" --repo "$GITHUB_REPOSITORY" --clobber; then
    uploaded=1
    break
  fi
  echo "    upload attempt $attempt failed; retrying in 5s" >&2
  sleep 5
done
[[ "$uploaded" == "1" ]] || { echo "release asset upload failed after 3 attempts" >&2; exit 1; }

url="$(gh release view "$TAG" --repo "$GITHUB_REPOSITORY" --json url --jq .url)"
echo "RELEASE_URL=$url"
gh release view "$TAG" --repo "$GITHUB_REPOSITORY" \
  --json tagName,name,isPrerelease,url,assets \
  --jq '{tagName,name,isPrerelease,url,assets:[.assets[]|{name,size,url}]}'
