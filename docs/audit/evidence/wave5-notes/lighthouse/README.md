# wave5 Lighthouse evidence — compacted (R369 size-gate paydown)

The eight full Lighthouse 12.8.2 result blobs (2.4MB total: lh-*.json + lha-*.json + nogzip-auth.json,
one 350-460KB per run) were compacted to `*.summary.json` (categories + the LCP/FCP/TBT/CLS/TTFB/
speed-index/interactive metrics + render-blocking items + runWarnings) — the T5 acceptance numbers and
the SPA-boot LCP diagnosis data survive verbatim; the full DOM/network traces do not. The r368 T5
record (d4c1aadc) quoted from these files: /auth 78, /capabilities 80, /legal/privacy 82 PERF,
a11y/BP/SEO 100x3, nogzip-auth 60, landing control 60. Full blobs recoverable by re-running the
documented protocol (prod build + gzip mirror, Lighthouse 12.8.2 mobile preset).
