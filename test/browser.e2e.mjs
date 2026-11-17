import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { stat, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const chromePath = [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find(existsSync);

test('index and films work without third-party requests; transcripts seek the self-hosted player', { skip: chromePath ? false : 'Chrome is not installed', timeout: 90000 }, async () => {
  const server = createServer(async (req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(`${root}${path.sep}`)) { res.writeHead(404).end(); return; }
    try {
      const info = await stat(file);
      const target = info.isDirectory() ? path.join(file, 'index.html') : file;
      const data = await readFile(target);
      res.setHeader('content-type', target.endsWith('.html') ? 'text/html' : target.endsWith('.js') ? 'text/javascript' : target.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : target.endsWith('.vtt') ? 'text/vtt' : target.endsWith('.css') ? 'text/css' : /\.(jpg|jpeg)$/i.test(target) ? 'image/jpeg' : target.endsWith('.svg') ? 'image/svg+xml' : 'application/octet-stream');
      res.end(data);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const profile = mkdtempSync(path.join(os.tmpdir(), 'lyceum-browser-'));
  const proc = spawn(chromePath, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
  let ws;
  try {
    let port;
    for (let i = 0; i < 100; i++) {
      try {
        port = Number(readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]);
        if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) break;
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(port, 'Chrome DevTools started');
    const target = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(base)}`, { method: 'PUT' })).json();
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let id = 0;
    const pending = new Map();
    ws.onmessage = ({ data }) => {
      const result = JSON.parse(data);
      if (result.id && pending.has(result.id)) { pending.get(result.id)(result); pending.delete(result.id); }
    };
    const send = (method, params = {}) => new Promise((resolve) => { const current = ++id; pending.set(current, resolve); ws.send(JSON.stringify({ id: current, method, params })); });
    const evaluate = async (expression) => {
      const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.result.exceptionDetails) throw new Error(result.result.exceptionDetails.exception.description);
      return result.result.result.value;
    };
    await send('Runtime.enable');
    await send('Network.enable');
    await send('Network.setBlockedURLs', { urls: ['*/*.m4s', '*/*.mp4'] });
    const waitFor = async (expression) => {
      for (let i = 0; i < 200; i++) {
        if (await evaluate(expression)) return;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      assert.fail(`Timed out waiting for ${expression}`);
    };
    for (const width of [1280, 390]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
      if (await evaluate('location.pathname') !== '/') await send('Page.navigate', { url: base });
      await waitFor(`location.pathname === '/' && !!document.querySelector('.card-poster img') && document.querySelector('.card-poster img').naturalWidth > 0`);
      const index = await evaluate(`({overflow: document.documentElement.scrollWidth > innerWidth, scripts: [...document.scripts].map(s => s.type), headings: [...document.querySelectorAll('h2')].map(e => e.textContent.trim())})`);
      assert.equal(index.overflow, false, `${width}px index`);
      assert.ok(index.headings.some((h) => h.startsWith('Maths')) && index.headings.some((h) => h.startsWith('Biology')));
      assert.ok(index.scripts.every((type) => type === 'application/ld+json'));
    }
    await send('Page.navigate', { url: `${base}/films/pythagoras/` });
    await waitFor(`location.pathname === '/films/pythagoras/' && !!document.querySelector('video') && !!document.querySelector('.transcript li a[data-t]')`);
    const film = await evaluate(`({overflow: document.documentElement.scrollWidth > innerWidth, scripts: [...document.scripts].map(s => new URL(s.src, location.href).origin), resources: performance.getEntriesByType('resource').map(e => e.name), cues: document.querySelectorAll('.transcript li').length, video: !!document.querySelector('video[data-hls]')})`);
    assert.equal(film.overflow, false);
    assert.ok(film.video && film.cues > 0);
    assert.ok(film.scripts.every((origin) => origin === new URL(base).origin));
    assert.ok(film.resources.every((url) => new URL(url).origin === new URL(base).origin), 'all browser requests are same-origin');
    await evaluate(`document.querySelector('.transcript a[data-t]').click()`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const seek = await evaluate(`({time: document.querySelector('video').currentTime, target: Number(document.querySelector('.transcript a[data-t]').dataset.t)})`);
    assert.ok(seek.time >= seek.target - 0.5, `transcript seeks to ${seek.target}s (at ${seek.time}s)`);
  } finally {
    if (ws) ws.close();
    proc.kill('SIGKILL');
    await new Promise((resolve) => {
      if (proc.exitCode !== null || proc.signalCode !== null) resolve();
      else proc.once('exit', resolve);
    });
    await new Promise((resolve) => server.close(resolve));
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
