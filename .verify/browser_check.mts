/**
 * Real-browser verification of the dev server.
 *
 * Launches headless Chrome against http://localhost:3000, captures console
 * errors and page exceptions, confirms the app mounts, clicks the Production
 * Checklist tab, and then generates the checklist PDF *inside the browser* via
 * the dev server's own module graph (the same code path the Download button
 * uses). The resulting PDF is saved so it can be diffed against the reference.
 *
 * Usage: node .verify/browser_check.mts [url] [outPdf]
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const URL_TARGET = process.argv[2] ?? 'http://localhost:3000/?tab=esx2pdf';
const OUT_PDF = process.argv[3] ?? path.join(here, 'harness', 'browser_out.pdf');
const PORT = 9333;

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];
const chromePath = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!chromePath) {
  console.error('No Chrome/Edge binary found');
  process.exit(2);
}

const profile = path.join(tmpdir(), 'dsh-checklist-chrome');
mkdirSync(profile, { recursive: true });

const chrome = spawn(
  chromePath,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--window-size=1400,1000',
    'about:blank',
  ],
  { stdio: 'ignore' }
);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function findTarget() {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = (await res.json()) as { type: string; id: string; webSocketDebuggerUrl?: string; url: string }[];
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      /* not listening yet */
    }
    await sleep(250);
  }
  throw new Error('CDP endpoint never appeared');
}

class Cdp {
  #ws: WebSocket;
  #next = 1;
  #pending = new Map<number, { resolve: (v: any) => void; reject: (e: any) => void }>();
  consoleErrors: string[] = [];
  pageErrors: string[] = [];
  failedRequests: string[] = [];

  private constructor(ws: WebSocket) {
    this.#ws = ws;
  }

  static async connect(wsUrl: string): Promise<Cdp> {
    const ws = new WebSocket(wsUrl);
    await new Promise<void>((resolve, reject) => {
      ws.addEventListener('open', () => resolve(), { once: true });
      ws.addEventListener('error', (e) => reject(e), { once: true });
    });
    const cdp = new Cdp(ws);
    ws.addEventListener('message', (ev) => cdp.#onMessage(ev));
    return cdp;
  }

  #onMessage(ev: MessageEvent) {
    const msg = JSON.parse(String(ev.data));
    if (msg.id && this.#pending.has(msg.id)) {
      const { resolve, reject } = this.#pending.get(msg.id)!;
      this.#pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      return;
    }
    if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
      const text = (msg.params.args ?? []).map((a: any) => a.value ?? a.description ?? '').join(' ');
      (msg.params.type === 'error' ? this.consoleErrors : []).push(text);
      if (msg.params.type === 'error') this.consoleErrors.push(text);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      this.pageErrors.push(d.exception?.description ?? d.text ?? 'unknown exception');
    }
    if (msg.method === 'Network.loadingFailed') {
      this.failedRequests.push(`${msg.params.errorText}`);
    }
  }

  send(method: string, params: Record<string, unknown> = {}): Promise<any> {
    const id = this.#next++;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      this.#ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.#pending.has(id)) {
          this.#pending.delete(id);
          reject(new Error(`CDP ${method} timed out`));
        }
      }, 120000);
    });
  }

  close() {
    this.#ws.close();
  }
}

const wsUrl = await findTarget();
const cdp = await Cdp.connect(wsUrl);
await cdp.send('Runtime.enable');
await cdp.send('Page.enable');
await cdp.send('Network.enable');

console.log(`navigating to ${URL_TARGET}`);
await cdp.send('Page.navigate', { url: URL_TARGET });
await sleep(1500);

async function evaluate(expression: string) {
  const res = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (res.exceptionDetails) {
    throw new Error(res.exceptionDetails.exception?.description ?? res.exceptionDetails.text);
  }
  return res.result.value;
}

// --- 1. wait for React to mount, then inspect ---
let mount: any = null;
for (let attempt = 0; attempt < 40; attempt++) {
  mount = await evaluate(`(() => {
    const root = document.getElementById('root');
    return {
      url: location.href,
      readyState: document.readyState,
      rootChildren: root ? root.children.length : -1,
      bodyText: document.body.innerText.slice(0, 300),
    };
  })()`);
  if (mount.rootChildren > 0) break;
  await sleep(500);
}
console.log('\n--- app mount ---');
console.log('url         :', mount.url);
console.log('readyState  :', mount.readyState);
console.log('root children:', mount.rootChildren);
console.log('body text   :', JSON.stringify(mount.bodyText));

if (mount.rootChildren <= 0) {
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(path.join(here, 'harness', 'mount_failure.png'), Buffer.from(shot.data, 'base64'));
  console.log('screenshot  : .verify/harness/mount_failure.png');
}

// --- 2. click through to the Production Checklist tab ---
const modeButtons = await evaluate(`(() => Array.from(document.querySelectorAll('button'))
  .map(b => (b.textContent || '').trim())
  .filter(t => /Proposal|Work Order|Audit|Checklist/i.test(t)))()`);
console.log('\n--- document mode tabs on the ESX to PDF screen ---');
console.log('modes:', JSON.stringify(modeButtons));

const clicked = await evaluate(`(() => {
  const btn = Array.from(document.querySelectorAll('button'))
    .find(b => /^Production Checklist$/i.test((b.textContent || '').trim()));
  if (!btn) return 'button not found';
  btn.click();
  return 'clicked';
})()`);
await sleep(900);
const afterClick = await evaluate(`(() => {
  const text = document.body.innerText;
  return {
    tabActive: Array.from(document.querySelectorAll('button'))
      .some(b => /^Production Checklist$/i.test((b.textContent || '').trim()) && /bg-slate-900/.test(b.className)),
    capturedPanel: /Captured from this claim/i.test(text),
    blankPanel: /Printed blank/i.test(text),
    capturedRows: (text.match(/jobNumber|claimNumber|deductibleAmount|contractAmount|estimator|startDate/g) || []).length,
    heading: /Production Checklist/.test(text),
  };
})()`);
console.log('\n--- production checklist tab ---');
console.log('click result    :', clicked);
console.log('tab active      :', afterClick.tabActive);
console.log('preview heading :', afterClick.heading);
console.log('captured panel  :', afterClick.capturedPanel, ' blank panel:', afterClick.blankPanel);
console.log('captured fields :', afterClick.capturedRows);

// Dump how each mode button currently looks, plus a screenshot, so a failed
// state transition can be diagnosed without guessing.
const buttonState = await evaluate(`(() => Array.from(document.querySelectorAll('button'))
  .filter(b => /Proposal|Work Order|Audit|Checklist/i.test(b.textContent || ''))
  .map(b => ({ text: (b.textContent || '').trim(), cls: b.className.split(' ').filter(c => c.startsWith('bg-') || c.startsWith('text-white')).join(' ') })))()`);
console.log('button classes  :', JSON.stringify(buttonState, null, 1));
const shot2 = await cdp.send('Page.captureScreenshot', { format: 'png' });
writeFileSync(path.join(here, 'harness', 'after_click.png'), Buffer.from(shot2.data, 'base64'));
console.log('screenshot      : .verify/harness/after_click.png');
console.log('body excerpt    :', JSON.stringify((await evaluate('document.body.innerText')).slice(300, 900)));

// --- 3. generate the PDF inside the browser, through the dev server ---
console.log('\n--- in-browser PDF generation (dev module graph) ---');
const generated = await evaluate(`(async () => {
  const mod = await import('/src/services/productionChecklistPdf.ts');
  const app = await import('/src/App.tsx');
  const doc = mod.generateProductionChecklistPdf(app.INITIAL_PROJECT);
  const dataUri = doc.output('datauristring');
  const base64 = dataUri.split(',')[1] || '';
  return { pages: doc.getNumberOfPages(), size: doc.output('arraybuffer').byteLength, b64Length: base64.length, b64: base64 };
})()`);
const bytes = Buffer.from(generated.b64, 'base64');
mkdirSync(path.dirname(OUT_PDF), { recursive: true });
writeFileSync(OUT_PDF, bytes);
console.log('pages       :', generated.pages);
console.log('pdf bytes   :', generated.size);
console.log('magic       :', bytes.subarray(0, 8).toString('latin1'));
console.log('written to  :', OUT_PDF);

// --- 4. errors ---
console.log('\n--- console/network diagnostics ---');
const seen = new Set<string>();
const uniqueErrors = cdp.consoleErrors.filter((e) => (seen.has(e) ? false : seen.add(e)));
console.log('console errors :', uniqueErrors.length);
uniqueErrors.slice(0, 10).forEach((e) => console.log('   !', e.slice(0, 200)));
console.log('page exceptions:', cdp.pageErrors.length);
cdp.pageErrors.slice(0, 5).forEach((e) => console.log('   !', e.slice(0, 200)));
console.log('failed requests:', cdp.failedRequests.length);
cdp.failedRequests.slice(0, 5).forEach((e) => console.log('   !', e));

cdp.close();
chrome.kill();
process.exit(0);
