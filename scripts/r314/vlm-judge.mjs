#!/usr/bin/env node
/**
 * R314 §3.3 cycle-2 — VLM pair-judge, RECALIBRATED (text-masked).
 *
 * CYCLE-1 FLAW (disclosed in PARITY.md): the unmasked hostile judge
 * (glm-5v-turbo) systematically returned DIFFERENT on RTL↔LTR pairs even when
 * composition matched — Arabic-vs-English text, RTL mirroring and differing
 * artwork subject (all permitted) were counted as differences despite prompt
 * instructions. MATCH was unreachable by construction (29/29 open, VLM floor).
 *
 * RECALIBRATION (this file):
 *   1. Pairs are built from TEXT-MASKED crops (see vlm-mask.mjs): every DOM
 *      text line on BOTH sites is greeked into a solid bar of its own colour,
 *      so the judge compares COMPOSITION, not script. Masking limits
 *      (honestly disclosed): Heron's cookie banner, award badge and use-case
 *      annotation cards render outside the DOM text layer (iframe/canvas/
 *      artwork-baked) and stay readable; the prompt therefore also forbids
 *      judging ANY text that remains readable (chrome/brand/artwork).
 *   2. The hostile two-framing SPIRIT is kept (QA reviewer + art director,
 *      union of differences, "any surviving difference → DIFFERENT") but the
 *      neutralized categories are stated as hard rules: text (masked or
 *      leftover), RTL mirroring, artwork subject, brand marks.
 *   3. Calibration ladder (run --calibrate before trusting a full run):
 *        self-pairs  (identical image left+right)  → MUST be MATCH
 *          (proves MATCH is reachable — guards against an over-hostile judge)
 *        trap-pairs  (mismatched sections)         → MUST be DIFFERENT
 *          (proves the judge is not lenient — guards against a judge that
 *           says MATCH to everything after the neutralization preamble)
 *   4. Every VLM answer is cached by sha256(prompt+image) under
 *      _local/vlm-cache/ so re-runs are free and rate limits are respected.
 *
 * Usage:
 *   node scripts/r314/vlm-judge.mjs --audit-cache   # count cached vs live calls (0 VLM calls)
 *   node scripts/r314/vlm-judge.mjs --verify-mask   # 2-image mask probes (6 calls)
 *   node scripts/r314/vlm-judge.mjs --calibrate     # self + trap controls (8 calls)
 *   node scripts/r314/vlm-judge.mjs                 # full 29-pair run (58 calls)
 *   node scripts/r314/vlm-judge.mjs --frame p-s08-0 # single pair
 * Env knobs for the shared glm-5v-turbo quota (429s are real and sustained):
 *   VLM_GAP_MS   (default 800)   min gap between live calls — use 3000-5000
 *                                for full 58-call batches
 *   VLM_MAX_RETRY(default 8)     attempts per call; 429 waits 60s+15s×attempt,
 *                                other errors 15s×attempt
 * Output: audits/evidence/r314/DIFFS.json (vlm items replaced by id; pixel
 * judge data lives in _local/judge/judge-report.json and is NOT touched here).
 *
 * CYCLE-2 NOTE: masked Madarek crops are re-captured against the CURRENT
 * landing (agent 3-a's height compaction landed between the first masked
 * capture and this run) with LIVE section-relative framing — see
 * vlm-mask.mjs --frames-mode live. Heron's masked crops are the single
 * prior live-load pass (drift-proven identical to the existing captures;
 * no further Heron loads). The pixel judge's numbers in PARITY remain the
 * cycle-1 measurements (pre-compaction) — disclosed in PARITY.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const req = (m) => createRequire(path.join(import.meta.dirname, 'tools/noop.js'))(m);
const sharp = req('sharp');

const ROOT = path.resolve(import.meta.dirname, '../..');
const CAP = path.join(ROOT, 'audits/evidence/r314/_local/captures-masked');
const PAIRS = path.join(ROOT, 'audits/evidence/r314/_local/pairs-masked');
const CACHE = path.join(ROOT, 'audits/evidence/r314/_local/vlm-cache');
const OUTJSON = path.join(ROOT, 'audits/evidence/r314/DIFFS.json');
const LOCAL = path.join(ROOT, 'audits/evidence/r314/_local');
fs.mkdirSync(PAIRS, { recursive: true });
fs.mkdirSync(CACHE, { recursive: true });

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

const NEUTRAL = `NEUTRALIZED CATEGORIES — permitted differences. NEVER report, mention or count them:
1. TEXT: both screenshots had their DOM text replaced by solid greeked bars (deliberate masking). Some text may still be readable — in fixed chrome widgets (cookie/consent banners, award badges), in brand wordmarks, or baked into artwork imagery (including numbers and dimension labels inside artwork). In ALL cases never judge text content, script, language, wording or reading direction. The only text-derived signal you may judge is the visual MASS of a text block (placement, size and weight of its bars).
2. RTL MIRRORING: the CANDIDATE is an Arabic right-to-left site; the REFERENCE is left-to-right. A layout that is the horizontal mirror of the reference (inline-start/inline-end swapped) is a PERMITTED match: compare start-edge to start-edge and end-edge to end-edge as if through a mirror. Mirroring alone is NOT a difference.
3. ARTWORK SUBJECT: illustrations, diagrams, photographs and UI mockups depict each site's own subject matter. Do NOT report subject-matter differences. DO judge their rendering style (hatching, stipple, line quality), tonal density, contrast range, scale, crop and placement.
4. BRAND MARKS: wordmarks, logos and award badges are each site's own — ignore their content entirely (their placement and geometry still count).

CALIBRATION RULES (follow exactly):
- VERIFY before reporting: only report a difference if you can point to the exact region where the two images demonstrably differ. Do NOT report speculation — "appears slightly", "seems shifted by a few pixels", "might be missing", or sub-pixel rendering noise are NOT differences. If you cannot confidently name the region and the difference, do not list it.
- If NO verified difference survives the neutralizations, the verdict is MATCH. Saying MATCH for a genuinely matching pair is CORRECT, not leniency.
- A clearly verifiable compositional difference (misplaced/missing/extra block, different spacing rhythm, different colour or tone, different line weight, different structure) IS a difference no matter how small — hostility applies to real differences only.`;

const FRAMING_A = `You are a hostile pixel-peeping design QA reviewer. LEFT = REFERENCE (must be matched), RIGHT = CANDIDATE.
${NEUTRAL}
Judge ONLY these axes: (1) composition — placement, visual mass, hierarchy, alignment of every block; (2) geometry — proportions, spacing rhythm, padding, gaps, column/grid structure; (3) colour system — palette, paper/ink tones, accent usage; (4) tone & texture — grain, rendering technique, contrast range; (5) line weights — hairlines, rules, borders, strokes, dashed/dotted patterns, plus-marks, ruler ticks.
List every VERIFIED difference that SURVIVES the neutralizations. A difference that falls entirely inside a neutralized category does not count.
Return STRICT JSON: {"verdict":"MATCH|DIFFERENT","score_0_100":int,"differences":[{"area":"","what_reference_has":"","what_candidate_has":"","severity":"critical|major|minor","fix_hint":""}]}. score_0_100: 100 = compositionally identical; 85–99 = verified but minor; below 60 = clearly different structure.
Any VERIFIED surviving difference → DIFFERENT. Be exhaustive about real differences. But do NOT invent differences from neutralized categories or from noise — that is a calibration error, not thoroughness.`;

const FRAMING_B = `Act as an uncompromising art director doing a side-by-side design audit. LEFT is the approved design (REFERENCE); RIGHT is the submission (CANDIDATE) that must reproduce the reference's visual system.
${NEUTRAL}
Walk the frame top-to-bottom, start-edge to end-edge. For every region compare ONLY: block placement and proportions; spacing rhythm and gaps; hairline/dashed/solid border treatments and line weights; plus-marks and ruler ticks; colour fills, paper tone, accent usage; tonal density and rendering technique of imagery; grain/texture.
Output STRICT JSON only: {"verdict":"MATCH|DIFFERENT","score_0_100":int,"differences":[{"area":"","what_reference_has":"","what_candidate_has":"","severity":"critical|major|minor","fix_hint":""}]}. score_0_100: 100 = compositionally identical; 85–99 = verified but minor; below 60 = clearly different structure.
Any VERIFIED surviving difference at all → DIFFERENT. No praise. Exhaustive list of real differences. A difference inside a neutralized category, or an unverified impression, does not count — reporting either is a calibration error.`;

async function buildPair(heronP, madP, label) {
  const a = await sharp(heronP).metadata();
  const W = a.width, H = a.height;
  const canvas = sharp({ create: { width: W * 2 + 12, height: H, channels: 3, background: { r: 255, g: 80, b: 80 } } });
  const left = await sharp(heronP).removeAlpha().toBuffer();
  const right = await sharp(madP).removeAlpha().toBuffer();
  await canvas.composite([
    { input: left, left: 0, top: 0 },
    { input: right, left: W + 12, top: 0 },
  ]).jpeg({ quality: 82 }).toFile(path.join(PAIRS, label + '.jpg'));
  return path.join(PAIRS, label + '.jpg');
}

let lastCall = 0;
const CACHED_ONLY = process.argv.includes('--cached-only'); // merge mode: skip live calls (quota exhausted), report cache-misses as skipped pairs
async function askVLM(imgPath, prompt, extraImages = []) {
  const key = sha(prompt + '\n\n' + sha(fs.readFileSync(imgPath).toString('binary')) + extraImages.map((p) => sha(fs.readFileSync(p).toString('binary'))).join(''));
  const cacheFile = path.join(CACHE, key + '.json');
  if (fs.existsSync(cacheFile)) return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  if (CACHED_ONLY) return { verdict: 'CACHE_MISS', score_0_100: 0, differences: [] };
  // rate-limit politeness: ≥VLM_GAP_MS (default 800ms, raise for sustained batches)
  // between live calls — a 58-call run at the default gap tripped the shared
  // quota's 429 window (see 429-patient retries below).
  const GAP = Number(process.env.VLM_GAP_MS || 800);
  const gap = Date.now() - lastCall;
  if (gap < GAP) await new Promise((r) => setTimeout(r, GAP - gap));
  const out = `/tmp/vlm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.json`;
  const args = ['vision', '-p', prompt, '-i', imgPath, ...extraImages.flatMap((p) => ['-i', p]), '-o', out];
  let raw = null;
  // 429-patient retries: the shared glm-5v-turbo quota can stay exhausted for many
  // minutes after a ~60-call batch (observed 2026-10-23 22:14→22:30+). A short
  // 3×20s ladder aborts the whole run mid-way (the exact failure that left the
  // first v2 run with 25/29 pairs). Rate-limit waits are long and capped-attempt;
  // other errors keep the shorter ladder.
  const MAX_ATTEMPTS = Number(process.env.VLM_MAX_RETRY || 8);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      // killSignal SIGKILL: a z-ai call can HANG indefinitely (observed 2026-10-24
      // ~00:35 — a hung call outlived execFileSync's default SIGTERM, silently
      // stalling the run until the sandbox reaped it). The hard kill converts the
      // hang into a normal retryable error so the ladder below stays bounded.
      execFileSync('z-ai', args, { timeout: 240000, killSignal: 'SIGKILL', stdio: 'pipe' });
      raw = JSON.parse(fs.readFileSync(out, 'utf8'));
      break;
    } catch (e) {
      if (attempt === MAX_ATTEMPTS - 1) throw e;
      const msg = String(e?.stderr || e?.message || e);
      const isRate = /429|Too many requests/i.test(msg);
      const wait = isRate ? 60000 + attempt * 15000 : 15000 * (attempt + 1);
      console.error(`  [vlm retry ${attempt + 1}/${MAX_ATTEMPTS}] ${msg.slice(0, 110)} — waiting ${Math.round(wait / 1000)}s`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  lastCall = Date.now();
  fs.unlinkSync(out);
  const content = raw?.choices?.[0]?.message?.content ?? '';
  const m = content.match(/\{[\s\S]*\}/);
  const parsed = m ? (() => { try { return JSON.parse(m[0]); } catch { return null; } })() : null;
  const result = parsed ?? { verdict: 'ERROR', score_0_100: 0, differences: [], raw: content.slice(0, 400) };
  // parse failures are NOT cached — a re-run retries them instead of freezing
  // an ERROR verdict into every subsequent run
  if (result.verdict !== 'ERROR') fs.writeFileSync(cacheFile, JSON.stringify(result));
  return result;
}

async function judgePair(label, heronP, madP, { framings } = { framings: [FRAMING_A, FRAMING_B] }) {
  const pairImg = await buildPair(heronP, madP, label);
  const verdicts = [];
  for (const prompt of framings) verdicts.push(await askVLM(pairImg, prompt));
  if (verdicts.some((v) => v.verdict === 'CACHE_MISS')) {
    return { id: label, verdict: 'SKIPPED', score: null, differences: [], framings: verdicts.map((v) => v.verdict), skipped: true, reason: 'quota-exhausted-429 (deferred to next run)' };
  }
  const match = verdicts.every((v) => v.verdict === 'MATCH');
  const score = Math.round(verdicts.reduce((s, v) => s + (v.score_0_100 || 0), 0) / verdicts.length);
  const union = [];
  for (const v of verdicts) for (const d of v.differences || []) union.push(d);
  return { id: label, verdict: match ? 'MATCH' : 'DIFFERENT', score, differences: union, framings: verdicts.map((v) => v.verdict) };
}

const onlyFrameRaw = process.argv.includes('--frame') ? process.argv[process.argv.indexOf('--frame') + 1] : null;
// accept all three spellings: 'p-s08-100' (usage-comment form), 's08-100',
// 'p-s08-100.png'. The original check only matched the last two, so
// `--frame p-s08-100` silently matched NOTHING and wrote a zero-result run
// (the 23:42 DIFFS.json mystery write — found while completing this task).
const onlyFrame = onlyFrameRaw
  ? [onlyFrameRaw, `p-${onlyFrameRaw}`, `${onlyFrameRaw}.png`, `p-${onlyFrameRaw}.png`]
  : null;
const singleFraming = process.argv.includes('--single');
const FRAMINGS = [FRAMING_A, ...(singleFraming ? [] : [FRAMING_B])];

// ---------- mode: --verify-mask (two-image probe: original vs masked) ----------
if (process.argv.includes('--verify-mask')) {
  const PROMPT = `You are shown TWO versions of the SAME website screenshot. Image 1 = original. Image 2 = same screenshot with all DOM-rendered text masked into solid colour bars.
Verify the masking. In IMAGE 2, find any location where DOM-rendered text (letters/words rendered by the page itself — headings, labels, nav, buttons, paragraphs) is STILL readable. Distinguish from text baked inside raster artwork (photographs, illustration images, screenshots-of-an-app shown as imagery) and fixed third-party widgets (cookie banners, award badges) — those are EXPECTED to remain and are not failures.
Also state whether the greeked bars in image 2 sit where the text was in image 1.
Answer STRICT JSON only: {"dom_text_readable_in_image2": true|false, "locations": ["..."], "expected_leftovers": ["..."], "bars_placed_correctly": true|false}`;
  const checks = [];
  // probe ids must exist as drift shots in vlm-mask.mjs (DRIFT_IDS = fold / mid / footer)
  for (const site of ['heron', 'madarek']) {
    for (const id of ['s00-0', 's04-50', 's08-0']) {
      const dir = path.join(CAP, site, '1440x900', 'light');
      const drift = path.join(dir, `drift-p-${id}.png`);
      const masked = path.join(dir, `p-${id}.png`);
      if (!fs.existsSync(drift) || !fs.existsSync(masked)) { console.log(`  (skip ${site} ${id}: no drift shot)`); continue; }
      // image order must match the prompt: Image 1 = ORIGINAL (drift), Image 2 = MASKED
      const r = await askVLM(drift, PROMPT, [masked]);
      checks.push({ site, frame: id, domTextReadable: !!r.dom_text_readable_in_image2, barsPlacedCorrectly: r.bars_placed_correctly !== false, expectedLeftovers: r.expected_leftovers || r.locations || [] });
      console.log(`${r.dom_text_readable_in_image2 ? 'LEAK ' : 'CLEAN'} ${site} ${id} bars=${r.bars_placed_correctly !== false} leftovers=${JSON.stringify(r.expected_leftovers || []).slice(0, 140)}`);
    }
  }
  fs.writeFileSync(path.join(LOCAL, 'vlm-maskcheck.json'), JSON.stringify({ generatedAt: new Date().toISOString(), checks }, null, 1));
  process.exit(0);
}

// ---------- mode: --audit-cache (plan a run: how many calls are already cached?) ----------
// Uses the SAME constants + key derivation as the real run (no drift): rebuilds
// each pair image exactly as judgePair would, derives the cache key per framing,
// and reports hits/misses. Makes 0 VLM calls. Run this BEFORE a big batch so a
// 429-exhausted quota never burns a half-run (the failure that interrupted the
// first new-prompt attempt 2026-10-23 ~22:30).
if (process.argv.includes('--audit-cache')) {
  const hDir = path.join(CAP, 'heron/1440x900/light');
  const mDir = path.join(CAP, 'madarek/1440x900/light');
  let cached = 0, live = 0;
  const liveByLabel = {};
  const plan = async (label, h, m) => {
    process.stdout.write(`  plan ${label}\r`);
    const pairImg = await buildPair(h, m, label);
    for (const prompt of FRAMINGS) {
      const key = sha(prompt + '\n\n' + sha(fs.readFileSync(pairImg).toString('binary')));
      if (fs.existsSync(path.join(CACHE, key + '.json'))) cached++;
      else { live++; liveByLabel[label] = (liveByLabel[label] || 0) + 1; }
    }
  };
  // the --calibrate ladder (4 controls × framings)
  await plan('self-heron-s04-50', path.join(hDir, 'p-s04-50.png'), path.join(hDir, 'p-s04-50.png'));
  await plan('self-madarek-s05-50', path.join(mDir, 'p-s05-50.png'), path.join(mDir, 'p-s05-50.png'));
  await plan('trap-heron-s00-vs-madarek-s08', path.join(hDir, 'p-s00-0.png'), path.join(mDir, 'p-s08-0.png'));
  await plan('trap-heron-s08-vs-madarek-s04', path.join(hDir, 'p-s08-0.png'), path.join(mDir, 'p-s04-0.png'));
  const calibLive = live;
  // the full run (29 pairs × framings)
  const frames = fs.readdirSync(hDir).filter((f) => f.startsWith('p-') && f.endsWith('.png')).sort();
  for (const f of frames) await plan(`${'1440x900'}-light-${f.replace('.png', '')}`, path.join(hDir, f), path.join(mDir, f));
  console.log(`audit-cache: calibration ${8 - calibLive}/8 cached (${calibLive} live) · full run ${58 - (live - calibLive)}/58 cached (${live - calibLive} live) · TOTAL cached=${cached} live=${live}`);
  const missList = Object.entries(liveByLabel).filter(([l]) => !l.startsWith('self-') && !l.startsWith('trap-'));
  if (missList.length) console.log('  pairs still needing live calls:', missList.map(([l, n]) => `${l}(${n})`).join(' '));
  process.exit(0);
}

// ---------- mode: --calibrate (self-pairs must MATCH, trap-pairs must DIFFER) ----------
if (process.argv.includes('--calibrate')) {
  const hDir = path.join(CAP, 'heron/1440x900/light');
  const mDir = path.join(CAP, 'madarek/1440x900/light');
  const controls = [];
  const add = async (label, h, m, expect) => {
    const r = await judgePair(label, h, m, { framings: FRAMINGS });
    controls.push({ ...r, expect });
    const pass = (expect === 'MATCH' && r.verdict === 'MATCH') || (expect === 'DIFFERENT' && r.verdict === 'DIFFERENT');
    console.log(`${pass ? 'PASS ' : '*FAIL'} ${label}: expect=${expect} got=${r.verdict} (framings ${r.framings.join('/')}) score=${r.score} diffs=${r.differences.length}`);
  };
  // self-pairs: identical image on both sides → the judge must be able to say MATCH
  await add('self-heron-s04-50', path.join(hDir, 'p-s04-50.png'), path.join(hDir, 'p-s04-50.png'), 'MATCH');
  await add('self-madarek-s05-50', path.join(mDir, 'p-s05-50.png'), path.join(mDir, 'p-s05-50.png'), 'MATCH');
  // trap-pairs: different sections presented as a pair → the judge must stay hostile
  await add('trap-heron-s00-vs-madarek-s08', path.join(hDir, 'p-s00-0.png'), path.join(mDir, 'p-s08-0.png'), 'DIFFERENT');
  await add('trap-heron-s08-vs-madarek-s04', path.join(hDir, 'p-s08-0.png'), path.join(mDir, 'p-s04-0.png'), 'DIFFERENT');
  const passed = controls.filter((c) => (c.expect === 'MATCH' ? c.verdict === 'MATCH' : c.verdict === 'DIFFERENT')).length;
  fs.writeFileSync(path.join(LOCAL, 'vlm-calibration.json'), JSON.stringify({ generatedAt: new Date().toISOString(), controls }, null, 1));
  console.log(`\ncalibration: ${passed}/${controls.length} controls pass`);
  process.exit(passed === controls.length ? 0 : 1);
}

// ---------- mode: full run over the 29 section-relative pairs ----------
const diffs = fs.existsSync(OUTJSON) ? JSON.parse(fs.readFileSync(OUTJSON, 'utf8')) : { generatedAt: new Date().toISOString(), items: [] };
const results = [];
for (const vp of fs.readdirSync(path.join(CAP, 'heron'))) {
  for (const theme of fs.readdirSync(path.join(CAP, 'heron', vp))) {
    const hDir = path.join(CAP, 'heron', vp, theme);
    const mDir = path.join(CAP, 'madarek', vp, theme);
    if (!fs.existsSync(mDir)) continue;
    const frames = fs.readdirSync(hDir).filter((f) => f.startsWith('p-') && f.endsWith('.png')).sort();
    for (const f of frames) {
      if (onlyFrame && !onlyFrame.includes(f)) continue;
      const label = `${vp}-${theme}-${f.replace('.png', '')}`;
      const r = await judgePair(label, path.join(hDir, f), path.join(mDir, f), { framings: FRAMINGS });
      const crit = r.differences.filter((d) => d.severity === 'critical').length;
      const maj = r.differences.filter((d) => d.severity === 'major').length;
      results.push({
        id: label, viewport: vp, theme, frame: f,
        verdict: r.verdict, score: r.score, differences: r.differences, framings: r.framings,
      });
      console.log(`${r.verdict === 'MATCH' ? '·MATCH·' : ' DIFFR '} ${label} score=${r.score} diffs=${r.differences.length} [${crit}c/${maj}m] (${r.framings.join('/')})`);
    }
  }
}
// merge into DIFFS.json (replace by id; preserve the cycle-1 verdict as prior)
for (const r of results) {
  const i = diffs.items.findIndex((x) => x.id === r.id);
  const prior = i >= 0 ? { verdict: diffs.items[i].verdict, score: diffs.items[i].score } : null;
  const entry = { ...r, status: (r.skipped || r.verdict === 'SKIPPED') ? 'deferred-quota' : (r.verdict === 'MATCH' ? 'closed' : 'open'), calibration: 'v2-text-masked' };
  if (prior) entry.prior = prior;
  if (i >= 0) diffs.items[i] = entry;
  else diffs.items.push(entry);
}
diffs.generatedAt = new Date().toISOString();
diffs.calibration = {
  version: 'v2-text-masked (cycle 2)',
  method: 'DOM greeking on both sites (per-line bars of each text node\'s own colour + transparent-text CSS net; see scripts/r314/vlm-mask.mjs — Madarek re-captured LIVE section-relative against the current landing, Heron from the single drift-proven pass); prompts state the neutralized categories (text, RTL mirroring, artwork subject, brand marks) as hard rules; self-pairs must MATCH and trap-pairs must DIFFERENT before a run is trusted (see _local/vlm-calibration.json).',
  maskingLimits: 'Heron\'s cookie banner, award badge and use-case annotation cards render outside the DOM text layer (iframe/canvas/artwork-baked) and stay readable; the prompt forbids judging any text that remains readable. Madarek artwork-baked text (platform UI mockup screenshots) equally stays readable.',
  legacyCycle1: { note: 'unmasked hostile judge: MATCH unreachable by construction on RTL pairs', items: 29, open: 29, closed: 0 },
};
fs.writeFileSync(OUTJSON, JSON.stringify(diffs, null, 1));
const open = diffs.items.filter((x) => x.verdict === 'DIFFERENT').length;
const deferred = diffs.items.filter((x) => x.status === 'deferred-quota').length;
const closed = diffs.items.filter((x) => x.verdict === 'MATCH').length;
console.log(`\nDIFFS.json: ${diffs.items.length} pairs · ${closed} closed (MATCH) · ${open} open (DIFFERENT) · ${deferred} deferred (quota)`);

// ---------- honesty guard: the judge must NOT have become lenient ----------
// A judge that closes everything after a neutralization preamble is broken the
// same way cycle-1's judge was broken in the hostile direction. Report the
// surviving opens with their compositional reasons, and shout if too few.
if (results.length) {
  const opens = results.filter((r) => r.verdict === 'DIFFERENT');
  console.log(`\nHONESTY GUARD — ${opens.length}/${results.length} pairs remain DIFFERENT (real compositional reasons required):`);
  for (const o of opens.slice(0, 8)) {
    const top = (o.differences || []).slice(0, 2).map((d) => `${d.area}: ${(d.what_reference_has || '').slice(0, 60)}… vs ${(d.what_candidate_has || '').slice(0, 60)}…`).join(' | ');
    console.log(`  OPEN ${o.id} score=${o.score}: ${top || '(no diff detail)'}`);
  }
  if (opens.length === 0) {
    console.log('  ⚠ ALL pairs MATCH — investigate before trusting (expected: several sections genuinely diverge).');
    console.log('    Check: calibration traps still DIFFERENT? masking leaks? prompt over-neutralized?');
  }
}
