# R313 — Cookie banner omission (NOTES-D15)

**Status:** permanent exception (owner-ratified in R313). Recorded as
**intentionally omitted**, not as an open gap.

## Why the reference has one

The reference ships a fixed cookie-consent banner (`#heron-cookie-root` >
`.cookie-banner.bg-global.is-visible` — 601×38 @1440, z 100009, four 1px black
border lines, Accept `#EFEFEF` / Reject, a mono `Learn more` link) because its
infrastructure sets tracking/analytics cookies: consent is persisted as a JSON
cookie (revision + categories + consentDate, `SameSite=Lax`) with
`window.HeronConsent` exposed, and the banner root re-renders on reload.
Measured: `audits/evidence/r313/reference/digest.json` → `cookieBanner`;
`parity-table.md` → D15.

## Why Madarek does not

Madarek sets **no tracking cookies** — no analytics, no third-party bytes, no
consent categories exist to gate. The only browser persistence is the
first-party authenticated session store (`localStorage['mdrk-auth']`, zustand
persist), which is strictly functional. A parity clone of the banner would
claim a cookie practice that does not exist — dishonest copy — and the
honest-copy hard contract (r168b/r177/r188) outranks visual parity.

## Consequences carried with the omission

- The reference's **single shadow exception** (the banner's hard black offset
  bar, `0 6.67px 0 -1.67px #000`) has no Madarek counterpart — the D3
  «no shadows» policy holds with **zero exceptions**.
- The banner's two button recipes (Accept fill-small `#EFEFEF`, Reject
  no-ic-small) have no counterparts; the shared D4 fill-wipe grammar covers
  every real Madarek button.

## Canon references

- `DESIGN.md` §0 → D15 line · `docs/redesign/r313/OVERRIDE-LEDGER.md` → D15 row.
