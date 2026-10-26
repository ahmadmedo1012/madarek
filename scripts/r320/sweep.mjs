/**
 * sweep.mjs — the R320 runtime-rule cell sweep (Rules 1, 4, 5).
 *
 * One page load per route × viewport × theme cell (the r319 cell
 * contract via gate-lib.makeContext), with the three runtime rules
 * riding the SAME page where their scopes overlap:
 *
 *   · cleanliness listeners attach BEFORE navigation and read out at
 *     the END of the cell (the full page-visit lifecycle, drawer
 *     interactions included);
 *   · rename-scan (admin routes) opens the drawer on touch viewports
 *     first — the nav group label «الإدارة» lives in it;
 *   · svg-collisions (landing) runs LAST — it resolves the ≤991px
 *     camera twin to the full plan and restores it after.
 *
 * Out-of-scope checks emit NA rows (the r319 convention: the table
 * stays square; every route × viewport × theme carries the same
 * check set).
 */
import { setTimeout as sleep } from 'node:timers/promises';
import { ROUTES, VIEWPORT_H, makeContext, naRow } from './gate-lib.mjs';
import { attachCleanliness, checkRenameScan, checkSvgCollisions } from './rules-runtime.mjs';

const SVG_ROUTES = new Set(['landing']);
const ADMIN_ROUTES = new Set(Object.keys(ROUTES).filter((r) => ROUTES[r].path.startsWith('/admin')));

async function navigatePage(page, baseUrl, routeDef) {
  await page.goto(`${baseUrl}${routeDef.path}`, { waitUntil: 'networkidle', timeout: 45000 }).catch(async () => {
    await page.waitForTimeout(1500);
  });
  if (routeDef.role) {
    await page.waitForSelector('header.topbar', { timeout: 15000 }).catch(() => null);
  } else {
    await page.waitForTimeout(1000); // banner/intro entrance settle
    await page.waitForSelector('.jt', { timeout: 6000 }).catch(() => null);
  }
  await page.waitForTimeout(700); // react-query settle
}

/**
 * Run the sweep. `opt` = parsed gate args (routes/viewports resolved
 * to arrays, baseUrl set). `want` = which runtime rules to run.
 * `keepList` = rename keep-list entries. `svgAllow` = the SVG
 * collision allowlist (r318 collision-allowlist discipline).
 * Returns cells[] (each { route, viewport, theme, authed, checks }).
 */
export async function runSweep(browser, transport, opt, want, keepList, svgAllow = []) {
  const cells = [];
  for (const routeName of opt.routes) {
    const routeDef = ROUTES[routeName];
    for (const theme of opt.themes) {
      for (const width of opt.viewports) {
        process.stderr.write(`[gate:r320] cell ${routeName} ${width}×${VIEWPORT_H[width] || 900} ${theme} (${[...want].join(',') || 'none'}) …\n`);
        const cell = { route: routeName, viewport: width, theme, authed: !!routeDef.role, checks: {} };
        const ctx = await makeContext(browser, transport, { routeDef, width, theme });
        try {
          const page = await ctx.newPage();
          const cleaner = want.has('cleanliness') ? attachCleanliness(page) : null;
          await navigatePage(page, opt.baseUrl, routeDef);
          if (want.has('cleanliness')) await sleep(500); // capture window past first paint

          if (want.has('rename-scan')) {
            cell.checks['rename-scan'] = ADMIN_ROUTES.has(routeName)
              ? await checkRenameScan(page, width, keepList)
              : naRow('rename scan is scoped to admin routes (§B RENAME)');
          }

          if (want.has('svg-collisions')) {
            cell.checks['svg-collisions'] = SVG_ROUTES.has(routeName)
              ? await checkSvgCollisions(page, svgAllow)
              : naRow('SVG collision sweep is scoped to the landing drawings (§A4)');
          }

          if (cleaner) {
            const { consoleRows, networkRows } = cleaner.rows();
            cell.checks['cleanliness/console'] = consoleRows;
            cell.checks['cleanliness/network'] = networkRows;
          }
          await page.close();
        } catch (err) {
          cell.error = String(err && err.message ? err.message : err).slice(0, 200);
        } finally {
          await ctx.close();
        }
        cells.push(cell);
      }
    }
  }
  return cells;
}
