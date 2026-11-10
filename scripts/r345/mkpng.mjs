import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 64, height: 64 } });
await p.setContent('<body style="margin:0;background:#FA3600"></body>');
await p.screenshot({ path: '/tmp/r345/orange.png' });
await b.close();
console.log('done');
