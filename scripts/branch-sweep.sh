#!/usr/bin/env bash
# ═════════════════════════════════════════════════════════════════════
# branch-sweep.sh — R340 Step 0: ONE branch policy.
#
# For every remote branch:
#   · fully merged into main → tag archive/<name> (if missing), push tag,
#     delete the remote branch.
#   · NOT merged → reported, left alone (lead decides).
#
# Target: `git ls-remote --heads origin` lists ONLY main.
# History is preserved in archive/* tags (93 pre-existing + new).
# Idempotent; safe to re-run at the end of every wave.
# ═════════════════════════════════════════════════════════════════════
set -uo pipefail
cd "$(dirname "$0")/.."

REMOTE="${1:-origin}"
MAIN="main"

echo "branch-sweep: fetching $REMOTE …"
git fetch "$REMOTE" --prune --tags --force >/dev/null 2>&1

BRANCHES=$(git for-each-ref --format='%(refname:short)|%(refname)' "refs/remotes/$REMOTE/" \
  | grep -v "refs/remotes/$REMOTE/HEAD$" | grep -v "refs/remotes/$REMOTE/$MAIN$" \
  | cut -d'|' -f1 || true)

if [[ -z "$BRANCHES" ]]; then
  echo "branch-sweep: only $MAIN remains. Clean."
  exit 0
fi

UNMERGED=0
for ref in $BRANCHES; do
  name="${ref#$REMOTE/}"
  ahead=$(git rev-list --count "$MAIN..$ref" 2>/dev/null || echo "?")
  if [[ "$ahead" == "0" ]]; then
    tag="archive/$name"
    if git rev-parse -q --verify "refs/tags/$tag" >/dev/null 2>&1 \
       && [[ "$(git rev-parse "$tag^{commit}")" == "$(git rev-parse "$ref^{commit}")" ]]; then
      echo "  tag $tag already at same commit — reusing"
    else
      if git tag -f "$tag" "$ref" >/dev/null 2>&1; then
        git push "$REMOTE" -f "refs/tags/$tag" >/dev/null 2>&1 || { echo "  ✗ tag push failed: $tag"; continue; }
        echo "  tagged $tag"
      else
        echo "  ✗ tag create failed: $tag"; continue
      fi
    fi
    if git push "$REMOTE" --delete "refs/heads/$name" >/dev/null 2>&1; then
      echo "  deleted $name"
    else
      echo "  ✗ delete failed: $name (protected?)"
    fi
  else
    echo "  UNMERGED ($name, $ahead commit(s)) — left alone"
    UNMERGED=$((UNMERGED+1))
  fi
done

git worktree prune >/dev/null 2>&1
REMAINING=$(git for-each-ref --format='%(refname:short)|%(refname)' "refs/remotes/$REMOTE/" \
  | grep -v "refs/remotes/$REMOTE/HEAD$" | grep -v "refs/remotes/$REMOTE/$MAIN$" \
  | cut -d'|' -f1 || true)
echo ""
if [[ -z "$REMAINING" ]]; then
  echo "branch-sweep: DONE — only $MAIN remains on $REMOTE."
  exit 0
else
  echo "branch-sweep: remaining branches:"
  echo "$REMAINING"
  [[ $UNMERGED -eq 0 ]] || echo "(unmerged branches require a lead decision)"
  exit 3
fi
