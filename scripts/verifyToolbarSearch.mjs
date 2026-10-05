// Read-only database/API checks and isolated Chrome layout verification.
import '../src/config/index.js';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../src/config/index.js';
import { searchGlobally } from '../src/services/globalSearchService.js';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const prisma = new PrismaClient();
let chrome, socket;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
try {
  const result = await searchGlobally({ prisma, query: 'aroc', provinceCodes: null, user: { role_name: 'Super Admin' } });
  assert.ok(!result.groups.appointments);
  assert.equal(result.total, Object.values(result.groups).reduce((sum, group) => sum + group.count, 0));
  assert.ok(result.groups.priests?.count > 0);
  console.log(`Live global search: Appointments excluded, other categories/counts retained (${result.total} matches).`);
  const profile = await mkdtemp(path.join(tmpdir(), 'estatus-toolbar-qa-'));
  chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let port;
  for (let i = 0; i < 40 && !port; i++) {
    try { port = (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; } catch { await pause(250); }
  }
  assert.ok(port, 'Chrome debugging connection unavailable');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  const pending = new Map(); let serial = 0;
  socket.onmessage = ({ data }) => { const message = JSON.parse(data); if (pending.has(message.id)) { const { resolve, reject, timer } = pending.get(message.id); clearTimeout(timer); pending.delete(message.id); message.error ? reject(new Error(message.error.message)) : resolve(message.result); } };
  const call = (method, params = {}) => new Promise((resolve, reject) => { const id = ++serial; const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Chrome command timed out: ${method}`)); }, 30000); pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async (expression) => { const r = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value; };
  await call('Page.enable');
  const token = jwt.sign({ role_name: 'Super Admin' }, JWT_SECRET, { expiresIn: '10m' });
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('token', ${JSON.stringify(token)});` });
  await call('Page.navigate', { url: 'http://localhost:3000/estatus/confrere' });
  for (let i = 0; i < 60; i++) { if (await evaluate(`!!document.querySelector('form[aria-label="Directory search and filters"]')`)) break; await pause(500); }
  for (const [name, width] of [['desktop', 1440], ['mobile', 375]]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await pause(500);
    const layout = await evaluate(`(() => { const form = document.querySelector('form[aria-label="Directory search and filters"]'); if (!form) throw new Error('Directory toolbar missing'); const rect = el => { const r = el.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right}; }; return { viewport: innerWidth, form:rect(form), controls:[...form.children].map(rect), input:rect(form.querySelector('.MuiOutlinedInput-root')) }; })()`);
    assert.equal(Math.round(layout.input.height), 40);
    assert.ok(layout.form.right <= width + 1, `${name}: toolbar overflows viewport`);
    for (const control of layout.controls) { assert.equal(Math.round(control.height), 40); assert.ok(control.right <= layout.form.right + 1); }
    for (let i = 0; i < layout.controls.length; i++) for (let j = i + 1; j < layout.controls.length; j++) { const a = layout.controls[i], b = layout.controls[j]; if (Math.abs(a.y - b.y) < 1) assert.ok(a.right <= b.x + 1 || b.right <= a.x + 1, `${name}: overlapping controls`); }
    if (name === 'desktop') { assert.equal(Math.round(layout.input.width), 280); assert.ok(layout.controls.every((r) => Math.abs(r.y - layout.controls[0].y) < 1)); }
    else assert.equal(Math.round(layout.input.width), Math.round(layout.form.width));
    const screenshot = await call('Page.captureScreenshot', { format: 'png' });
    await writeFile(new URL(`../../qa-artifacts/toolbar-${name}.png`, import.meta.url), Buffer.from(screenshot.data, 'base64'));
    console.log(`Chrome ${name}: aligned 40px controls, ${Math.round(layout.input.width)}px search, no overlap/overflow.`);
  }
} catch (error) {
  console.error('Verification failed:', error.message);
  process.exitCode = 1;
} finally {
  socket?.close(); chrome?.kill(); await prisma.$disconnect();
}
