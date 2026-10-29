#!/usr/bin/env node
/* focused map-era capture: the intro card's corner + the dim chain */
import { chromium } from 'playwright';
import path from 'node:path';
const OUT = 'docs/redesign/r323/evidence';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
// scroll into the map pin, then push through the card era
const h = await page.evaluate(() => document.body.scrollHeight);
await page.evaluate((H) => window.scrollTo(0, H * 0.42), h);
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(OUT, 'map-card-era-1440.png') });
await page.evaluate((H) => window.scrollTo(0, H * 0.5), h);
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(OUT, 'map-card-era2-1440.png') });
await browser.close();
console.log('done');
