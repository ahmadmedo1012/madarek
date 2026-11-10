# R347 tools.md — honest install/login log (Phase 0)

| tool | status | reason |
|---|---|---|
| claude-mem | unavailable | Claude Code plugin runtime does not exist on this box (this agent is Z.ai Code, not Claude Code); `npx claude-mem install` has no host to install into. Persistent memory is replaced by this round's RESUME.md + DEFECTS-A.md, committed and pushed like every other artifact. |
| gstack | unavailable | it is a Claude skills pack (design-review/QA/eng-review/ship roles ride Claude Code slash-commands). Nothing on this box could execute it. Reviewer role is covered by this agent's own fresh-judge VLM sub-calls per defect. |
| ruflo | unavailable | `claude mcp add ruflo` — no Claude Code host on this box. Analysis fan-out is covered by batched ripgrep/Playwright runs in one call each. |
| ponytail | unavailable | Claude Code command pack (`/ponytail-audit`, `/ponytail-debt`); no host. Dead-code duties stay with Lane Z's measured demolition (dead.mjs + crawl), not skipped. |
| impeccable / ui-ux-pro-max / frontend-design / web-design-guidelines | unavailable | Claude skills; no host. Their intent is covered by the detector + VLM judging against the captured Heron reference. |
| knip / jscpd | available on demand | npx-runnable; not needed for Lane A (no new deps added); Lane Z owns debt. |
| Playwright | available | chromium for @playwright/test 1.60 installed to /home/z/.cache/ms-playwright; the detector runs against the repo's own workspaces-hoisted playwright. |
| Chrome DevTools / Firecrawl MCP | unavailable | MCP hosts are Claude-side; Playwright covers capture duty (Heron captures included). |
| Expo / GitHub Actions logs | not needed | Lane A owns no mobile/workflow files; CI status read via the public API (green at e49e721a). |

Credentials: /home/z/.madarek-env written (chmod 600, EXPO_TOKEN only). **GITHUB_TOKEN was redacted by the upload pipeline in the pasted R347 prompt** (`[REDACTED:github_token]`) — clone/fetch work (public repo), push is blocked until the owner supplies it in chat. Logged here so no later phase fakes a push.

Session note (R347, second session): the first session's box was wiped mid-lane (all local work lost; nothing had been pushed because of the token blocker). This session rebuilt the lane from the same recipe — every decision, anchor and number below is re-derived, never assumed.
