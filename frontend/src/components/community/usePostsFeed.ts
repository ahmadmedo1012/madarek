/**
 * usePostsFeed — the ONE posts-feed state machine (r341/A-Medic).
 *
 * The feed's logic — draft persistence, the optimistic like/un-like
 * ledger, the reaction-count snapshots, the burst/fail transients and
 * the trending-tag derivation — used to live byte-copied in BOTH
 * SocialPage (MorePages.tsx) and PostsFeedPanel
 * (CommunitySocialPanels.tsx): same hooks, same sessionStorage key,
 * same mutation callbacks, 130 duplicated lines (jscpd's biggest TSX
 * clone at 1017 tokens). The two surfaces keep their own JSX sheets
 * (the r319 pattern page vs the community Card kit) but MUST stay in
 * lock-step behaviourally — one draft per user across both surfaces,
 * one optimistic ledger per session — so the machine itself ships
 * once, here, and both components consume it.
 *
 * Tests pin this contract at the component boundary (tests/unit/
 * MorePages-social.test.tsx + CommunityPages-studyrooms-posts.test.tsx):
 * the hooks are mocked at useResources/lib-api module boundaries, so
 * both suites exercise this file through the components unchanged.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/auth.store';
import { api, unwrap } from '../../lib/api';
import { usePosts, useCreatePost, useReactToPost, type Post } from '../../hooks/useResources';

/* ── trending tags ───────────────────────────────────────────────────
 * "الأكثر تداولاً" — derived from the loaded feed, never hardcoded:
 * the top hashtags by frequency across the fetched posts (usePosts
 * loads the latest 20). Hidden entirely while loading, on error, or
 * when no loaded post carries a hashtag — an honest absence beats a
 * fabricated trend (audit 0-f P1). */
function topHashtags(posts: Post[] | undefined, limit = 5): Array<{ tag: string; count: number }> {
  if (!posts?.length) return [];
  const counts = new Map<string, number>();
  for (const p of posts) {
    for (const t of p.hashtags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'ar'))
    .slice(0, limit);
}

export function usePostsFeed() {
  const posts = usePosts();
  const createPost = useCreatePost();
  const reactToPost = useReactToPost();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  /* Composer draft persistence (the SocialPage contract): sessionStorage
   * keyed by user — a draft is content, losing it on a stray refresh or
   * a tab switch would be the audit's cheapest "this platform cares"
   * miss (5-C5 / A12 P3-3). The KEY is shared by every surface that
   * renders this feed, so a user active on both keeps ONE draft, never
   * two diverging copies. */
  const draftKey = `mdrk:social-draft:${user?.id ?? 'me'}`;
  const [draft, setDraft] = useState<string>(() => {
    try {
      return sessionStorage.getItem(draftKey) ?? '';
    } catch {
      return ''; // private-mode browsers: the draft stays session-local
    }
  });
  useEffect(() => {
    try {
      if (draft) sessionStorage.setItem(draftKey, draft);
      else sessionStorage.removeItem(draftKey);
    } catch {
      /* best-effort persistence only */
    }
  }, [draft, draftKey]);

  const [reactedIds, setReactedIds] = useState<Set<string>>(new Set());
  /* The real un-like. DELETE /posts/:id/react is own-reaction-only by
   * construction (the compound key pins the caller, 5-B1 hand-off), so
   * the pressed heart is a working toggle. The set below carries THIS
   * session's optimistic un-presses on top of the server truth. */
  const [unreactedIds, setUnreactedIds] = useState<Set<string>>(new Set());
  /* viewerReacted seeds the hearts (18-F2/18-G) — the session-local
   * sets only ride this session's optimistic toggles ON TOP of it. */
  const serverReactedIds = useMemo(
    () => new Set((posts.data ?? []).filter((p) => p.viewerReacted).map((p) => p.id)),
    [posts.data],
  );
  const hasReacted = (id: string) =>
    (serverReactedIds.has(id) || reactedIds.has(id)) && !unreactedIds.has(id);
  /* Reaction-count snapshot at click time. When a like/un-like succeeds,
   * the ['posts'] invalidation delivers a server count that ALREADY
   * includes the change — max(server, snapshot ± 1) keeps the optimistic
   * delta during flight without double-counting after the refetch
   * (audit 0-f P2 double-count risk). */
  const [reactionBase, setReactionBase] = useState<Record<string, number>>({});
  /* transient per-post feedback: burst = the scale-pop on the reacted
   * counter, fail = the rollback note with retry */
  const [burstId, setBurstId] = useState<string | null>(null);
  const [failedLike, setFailedLike] = useState<{ id: string; mode: 'like' | 'unlike' } | null>(null);
  const burstTimer = useRef<number | undefined>(undefined);
  const failTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => {
    window.clearTimeout(burstTimer.current);
    window.clearTimeout(failTimer.current);
  }, []);
  /* Server truth arrival (the invalidation's refetch lands) clears the
   * session-local toggles — the pressed states and counts then read
   * straight from the payload, so a stale optimistic delta can never
   * outlive its own refetch (and an un-pressed heart that the server
   * still counts re-syncs to the truth). */
  useEffect(() => {
    setReactedIds(new Set());
    setUnreactedIds(new Set());
    setReactionBase({});
  }, [posts.data]);

  const publish = () => {
    if (!draft.trim() || createPost.isPending) return;
    // Extract simple #hashtags from the body for proper persistence.
    const tags = (draft.match(/#[\u0600-\u06FF\w_]+/g) ?? []).map((t) => t.slice(1));
    createPost.mutate(
      { body: draft.trim(), hashtags: tags },
      { onSuccess: () => setDraft('') },
    );
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    publish();
  };

  const onLike = (id: string, serverCount: number) => {
    if (hasReacted(id)) return;
    setReactionBase((prev) => ({ ...prev, [id]: serverCount }));
    setReactedIds((prev) => new Set([...prev, id]));
    setUnreactedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setBurstId(id);
    window.clearTimeout(burstTimer.current);
    burstTimer.current = window.setTimeout(() => setBurstId(null), 700);
    reactToPost.mutate(
      { postId: id, kind: 'like' },
      {
        onError: () => {
          setReactedIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          setFailedLike({ id, mode: 'like' });
          window.clearTimeout(failTimer.current);
          failTimer.current = window.setTimeout(() => setFailedLike(null), 5000);
        },
      },
    );
  };

  /* Un-like — the inline DELETE mutation (a pending un-like of the same
   * post is superseded by this click). */
  const removeLike = useMutation({
    mutationFn: (postId: string) =>
      unwrap<{ ok: boolean }>(api.delete(`/posts/${postId}/react`, { data: { kind: 'like' } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  });
  const onUnlike = (id: string, serverCount: number) => {
    if (!hasReacted(id)) return;
    setReactionBase((prev) => ({ ...prev, [id]: serverCount }));
    setUnreactedIds((prev) => new Set([...prev, id]));
    removeLike.mutate(id, {
      onError: () => {
        setUnreactedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setFailedLike({ id, mode: 'unlike' });
        window.clearTimeout(failTimer.current);
        failTimer.current = window.setTimeout(() => setFailedLike(null), 5000);
      },
    });
  };

  const trending = topHashtags(posts.data);
  const likeInFlight = (id: string) =>
    (reactToPost.isPending && reactToPost.variables?.postId === id)
    || (removeLike.isPending && removeLike.variables === id);

  return {
    user,
    posts,
    createPost,
    draft,
    setDraft,
    submit,
    publish,
    hasReacted,
    reactedIds,
    unreactedIds,
    reactionBase,
    burstId,
    failedLike,
    onLike,
    onUnlike,
    likeInFlight,
    trending,
  };
}
