#!/usr/bin/env node
/**
 * R314 §3.3 — VLM judge (the human-eye proxy). Adversarial, never "does it
 * look similar?". Two framings; union of differences. Output → DIFFS.json.
 * Uses z-ai CLI (glm-5v-turbo) exactly as the R313 notes did.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const req = (m) => createRequire(path.join(import.meta.dirname, 'tools/noop.js'))(m);
const sharp = req('sharp');

const ROOT = path.resolve(import.meta.dirname, '../..');
const CAP = path.join(ROOT, 'audits/evidence/r314/_local/captures');
const PAIRS = path.join(ROOT, 'audits/evidence/r314/_local/pairs');
const OUTJSON = path.join(ROOT, 'audits/evidence/r314', 'DIFFS.json');
fs.mkdirSync(PAIRS, { recursive: true });

const FRAMING_A = `You are a hostile pixel-peeping design QA reviewer. Left = REFERENCE (must be matched), right = CANDIDATE.
The reference text is English and the candidate is Arabic RTL — IGNORE the language and the logo/artwork subject.
List EVERY visible difference in: (1) layout/position/size of every block, (2) scale of type and its weight/tracking/case, (3) line weights, borders, dashed/dotted patterns, hairlines, plus-marks, rulers, (4) fills/colours/tonal range, (5) imagery STYLE (rendering technique: hatching, stipple, grain, line weight, contrast), (6) paper texture/grain, (7) spacing/padding/gaps, (8) chrome (header/cookie/edge tab/footer cells), (9) state/motion phase shown.
Return STRICT JSON: {"verdict":"MATCH|DIFFERENT","score_0_100":int,"differences":[{"area":"","what_reference_has":"","what_candidate_has":"","severity":"critical|major|minor","fix_hint":""}]}.
Never say "similar". If anything differs, verdict is DIFFERENT. Be exhaustive.`;

const FRAMING_B = `Act as an uncompromising art director doing a side-by-side design audit. LEFT image is the approved design (REFERENCE). RIGHT image is the submission (CANDIDATE) that must reproduce the reference's visual system exactly, except its text is Arabic RTL and its logo/illustration subject matter is its own (ignore those two things only).
Walk the frame top-to-bottom, left-to-right. For every region, compare: block placement and proportions; typographic scale, weight, casing; hairline/dashed/solid border treatments; plus-marks, ruler ticks, registration marks; colour fills and tonal density of artwork (hatching weight, stipple density, contrast range); paper grain; spacing rhythm; fixed chrome elements (top header cells, bottom-right consent banner, right-edge vertical tab).
Output STRICT JSON only: {"verdict":"MATCH|DIFFERENT","score_0_100":int,"differences":[{"area":"","what_reference_has":"","what_candidate_has":"","severity":"critical|major|minor","fix_hint":""}]}.
Any difference at all → "DIFFERENT". No praise. Exhaustive list.`;

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

function askVLM(imgPath, prompt) {
  const out = `/tmp/vlm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.json`;
  execFileSync('z-ai', ['vision', '-p', prompt, '-i', imgPath, '-o', out], { timeout: 180000, stdio: 'pipe' });
  const raw = JSON.parse(fs.readFileSync(out, 'utf8'));
  fs.unlinkSync(out);
  const content = raw.choices?.[0]?.message?.content ?? '';
  const m = content.match(/\{[\s\S]*\}/);
  if (!m) return { verdict: 'ERROR', score_0_100: 0, differences: [], raw: content.slice(0, 400) };
  try { return JSON.parse(m[0]); } catch { return { verdict: 'ERROR', score_0_100: 0, differences: [], raw: content.slice(0, 400) }; }
}

const onlyFrame = process.argv.includes('--frame') ? process.argv[process.argv.indexOf('--frame') + 1] : null;
const singleFraming = process.argv.includes('--single');

const diffs = fs.existsSync(OUTJSON) ? JSON.parse(fs.readFileSync(OUTJSON, 'utf8')) : { generatedAt: new Date().toISOString(), items: [] };
const results = [];
for (const vp of fs.readdirSync(CAP + '/heron')) {
  for (const theme of fs.readdirSync(path.join(CAP, 'heron', vp))) {
    const hDir = path.join(CAP, 'heron', vp, theme);
    const mDir = path.join(CAP, 'madarek', vp, theme);
    if (!fs.existsSync(mDir)) continue;
    const frames = fs.readdirSync(hDir).filter((f) => /^p\d+/.test(f)).sort();
    for (const f of frames) {
      if (onlyFrame && f !== onlyFrame) continue;
      const label = `${vp}-${theme}-${f.replace('.png', '')}`;
      const pairImg = await buildPair(path.join(hDir, f), path.join(mDir, f), label);
      const fr = [FRAMING_A, ...(singleFraming ? [] : [FRAMING_B])];
      const verdicts = [];
      for (const prompt of fr) verdicts.push(askVLM(pairImg, prompt));
      const match = verdicts.every((v) => v.verdict === 'MATCH');
      const score = Math.round(verdicts.reduce((s, v) => s + (v.score_0_100 || 0), 0) / verdicts.length);
      const union = [];
      for (const v of verdicts) for (const d of v.differences || []) union.push(d);
      results.push({ id: label, viewport: vp, theme, frame: f, verdict: match ? 'MATCH' : 'DIFFERENT', score, differences: union });
      console.log(`${match ? '·MATCH·' : ' DIFFR '} ${label} score=${score} diffs=${union.length} [${union.filter(d => d.severity === 'critical').length}c/${union.filter(d => d.severity === 'major').length}m/${union.filter(d => d.severity === 'minor').length}n]`);
    }
  }
}
// merge into DIFFS.json (replace by id)
for (const r of results) {
  const i = diffs.items.findIndex((x) => x.id === r.id);
  if (i >= 0) diffs.items[i] = { ...r, status: 'open' };
  else diffs.items.push({ ...r, status: 'open' });
}
diffs.generatedAt = new Date().toISOString();
fs.writeFileSync(OUTJSON, JSON.stringify(diffs, null, 1));
const open = diffs.items.filter((x) => x.verdict === 'DIFFERENT').length;
console.log(`\nDIFFS.json: ${diffs.items.length} pairs, ${open} DIFFERENT (open)`);
