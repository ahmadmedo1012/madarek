/* P2.6 island verifier — for each flagged (route, bp, box): load the
 * route in Ink, find the element at the box centre, report its computed
 * background/colour chain so REAL islands get distinguished from text/
 * raster masses. Writes audits/evidence/r325/ink-app/verify.json. */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.VITE_URL || 'http://localhost:5211/';
const API = 'http://localhost:4000';
const EXEC = process.env.CHROME_BIN || '/home/z/.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell';
const OUT = path.resolve(process.cwd(), 'audits/evidence/r325/ink-app');
fs.mkdirSync(OUT, { recursive: true });

const findings = JSON.parse(fs.readFileSync('audits/evidence/r325/routes/ledger-findings.json', 'utf8'))
  .findings.filter((f) => f.class === 'INK-ISLAND');

const login = await fetch(`${API}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'student@test.ly', password: '12345678' }) });
const stu = (await login.json()).data;
const loginT = await fetch(`${API}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'teacher@test.ly', password: '12345678' }) });
const tea = (await loginT.json()).data;

const SESSIONS = { student: stu, teacher: tea };
const ROLE_PATH = { student: '/student/dashboard', teacher: '/teacher/dashboard' };

const browser = await chromium.launch({ executablePath: EXEC });
const verdicts = [];

// group findings by (role, slug)
const byRoute = new Map();
for (const f of findings) {
  const key = `${f.role}/${f.slug}`;
  if (!byRoute.has(key)) byRoute.set(key, []);
  byRoute.get(key).push(f);
}

for (const [key, fs_] of byRoute) {
  const [role, slug] = key.split('/');
  const session = SESSIONS[role];
  if (!session) { verdicts.push({ key, verdict: 'no-session' }); continue; }
  const ctx = await browser.newContext({ baseURL: BASE, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => sessionStorage.setItem('madarek-intro-skip', '1'));
  await page.addInitScript((s) => {
    localStorage.setItem('mdrk-auth', s);
    localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode: 'dark', modeUpdatedAt: 1 }, version: 2 }));
  }, JSON.stringify({ state: { user: session.user, accessToken: session.accessToken, isAuthenticated: true }, version: 0 }));
  try {
    await page.goto(`${BASE}${ROLE_PATH[role].replace('/dashboard', '')}${slug === 'forbidden-owner-users' ? '' : ''}`.replace(/\/$/, '') , { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    // map slug → real path
    const paths = {
      ai: role === 'student' ? '/student/ai' : '/teacher/ai',
      dashboard: role === 'student' ? '/student/dashboard' : '/teacher/dashboard',
      'forbidden-owner-users': '/owner/users', gamification: '/student/gamification',
      'lecture-player': '/student/live', profile: role === 'student' ? '/student/profile' : '/teacher/profile',
      research: '/student/research', results: '/student/results', university: '/student/university',
    };
    await page.goto(`${BASE}${(paths[slug] ?? ROLE_PATH[role]).replace(/^\//, '')}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    for (const f of fs_) {
      // box = [x1, y1, x2, y2] — sample the centre + a 3-point grid
      const box = f.desc.match(/\[(\d+), (\d+), (\d+), (\d+)\]/);
      if (!box) { verdicts.push({ key, bp: f.bp, verdict: 'no-box' }); continue; }
      const cx = (Number(box[1]) + Number(box[3])) / 2;
      const cy = (Number(box[2]) + Number(box[4])) / 2;
      const probe = await page.evaluate(({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        if (!el) return { verdict: 'no-element' };
        const chain = [];
        let cur = el;
        for (let i = 0; i < 5 && cur; i++) {
          const cs = getComputedStyle(cur);
          chain.push({
            tag: cur.tagName?.toLowerCase(), cls: String(cur.className).slice(0, 60),
            bg: cs.backgroundColor, color: cs.color, bgi: (cs.backgroundImage || '').slice(0, 60),
          });
          cur = cur.parentElement;
        }
        const text = (el.innerText || '').slice(0, 60);
        const isImg = el.tagName === 'IMG' || el.tagName === 'SVG' || el.tagName === 'CANVAS' || el.querySelector?.('img,svg,canvas');
        return { chain, text, isImg };
      }, { x: cx, y: cy }).catch((e) => ({ verdict: 'probe-error', msg: String(e).slice(0, 80) }));
      verdicts.push({ key, bp: f.bp, box: f.desc.match(/\[[^]]+\]/)?.[0], probe });
    }
  } catch (e) {
    verdicts.push({ key, verdict: 'goto-error', msg: String(e).slice(0, 120) });
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'verify.json'), JSON.stringify(verdicts, null, 1));
console.log('verdicts:', verdicts.length, '→', path.join(OUT, 'verify.json'));
for (const v of verdicts.slice(0, 6)) {
  const c = v.probe?.chain?.[0];
  console.log(v.key, v.bp, v.box, '→', c ? `${c.tag}.${c.cls?.slice(0, 24)} bg=${c.bg} text="${(v.probe.text || '').slice(0, 24)}" img=${v.probe.isImg}` : v.verdict);
}
