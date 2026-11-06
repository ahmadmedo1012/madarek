# r339 arsenal — tool log

- [T-00] git fetch --prune — sync remote branch/ref state before triage
- [T-00] git branch -r --merged/--no-merged — split 74 remote branches into 57 merged / 16 unmerged
- [T-00] git merge-tree --write-tree — no-op detection: merged-tree vs `origin/main^{tree}` per unmerged branch
- [T-00] git diff (three-dot + tip-vs-tip) — source-delta review vs merge-base and vs current main (supersession proof)
- [T-00] rg (ripgrep) — marker searches in `git show main:<file>` blobs (st-pill-icon-b, --rl-soft-ink, --wy-sx, MARK_PATHS)
- [T-00] git tag -a + git push (refs/tags/archive/*) — 72 annotated archive tags pushed and ls-remote-verified BEFORE any branch deletion
- [T-00] git push origin --delete — remote branch deletion (72 branches, tags-first rule honored)
- [T-00] git worktree prune — stale worktree cleanup check from /home/z/madarek (none dead)
