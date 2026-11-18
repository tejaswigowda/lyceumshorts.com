import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../scripts/generate.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFile(path.join(root, file), 'utf8');

test('homepage uses a pinned 1200 by 630 landscape card without changing film posters', async () => {
  const blog = JSON.parse(await read('blog.json'));
  const lock = JSON.parse(await read('assets.lock.json'));
  const sha = lock['images/lyceum-share.png'];
  assert.equal(blog.cover, 'asset:images/lyceum-share.png');
  const url = `https://lyceumshorts.com/share/${sha}/renders/lyceum-share.png`;
  const png = await readFile(path.join(root, `share/${sha}/renders/lyceum-share.png`));
  assert.equal(png.subarray(12, 16).toString(), 'IHDR');
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  const generated = build();
  for (const html of [await read('index.html'), generated.get('index.html')]) {
    assert.ok(html.includes(`<meta property="og:image" content="${url}">`));
    assert.equal((html.match(/property="og:image"/g) || []).length, 1);
    assert.match(html, /name="twitter:card" content="summary_large_image"/);
  }
  assert.match(generated.get('films/pythagoras/index.html'), /property="og:image" content="https:\/\/lyceumshorts\.com\/renders\/pythagoras\/poster\.jpg"/);
});

test('build uses authored markdown and settings without producing or overwriting them', () => {
  const overrides = new Map([
    ['films/pages/pythagoras.md', readFileSync(path.join(root, 'films/pages/pythagoras.md'), 'utf8').replace('Shows the relationship in particular cases.', 'Shows an edited relationship in particular cases.')],
    ['films/blog.json', JSON.stringify({ ...JSON.parse(readFileSync(path.join(root, 'films/blog.json'), 'utf8')), title: 'Edited Lyceum' })],
  ]);
  const files = build({ readSource: (file) => overrides.get(file) ?? readFileSync(path.join(root, file), 'utf8') });
  assert.match(files.get('films/pythagoras/index.html'), /Shows an edited relationship in particular cases/);
  assert.match(files.get('films/pythagoras/index.html'), /content="Edited Lyceum"/);
  assert.match(files.get('films/pythagoras/index.html'), /data-hls=/);
  assert.equal(files.has('films/pages/pythagoras.md'), false);
  assert.equal(files.has('films/blog.json'), false);
  assert.equal(files.has('pages/home.md'), false);
  assert.equal(files.has('blog.json'), false);
});

test('build refuses a stale-render notice inconsistent with film metadata', () => {
  const file = 'films/pages/pythagoras.md';
  const original = readFileSync(path.join(root, file), 'utf8');
  const stale = original.replace('<div class="lyceum-player"></div>', '<p class="stale">Stale render.</p>\n<div class="lyceum-player"></div>');
  assert.notEqual(stale, original);
  assert.throws(() => build({ readSource: (name) => name === file ? stale : readFileSync(path.join(root, name), 'utf8') }), /stale-render notice.*disagrees/);
});

test('canonical markdown and generated pages preserve all six film routes and the site contract', async () => {
  const lyceum = JSON.parse(await read('lyceum.json'));
  const blog = JSON.parse(await read('blog.json'));
  assert.equal(blog.title, 'Lyceum Shorts');
  assert.equal(blog.domain, 'https://lyceumshorts.com');
  assert.equal(blog.repo, 'tejaswigowda/lyceumshorts.com');
  const index = await read('index.html');
  assert.match(index, /x-generator" content="blog-webcli@/);
  assert.match(index, /<h1[^>]*>Short films that ship their own source/);
  assert.equal((index.match(/class="card-poster"/g) || []).length, lyceum.entries.length);
  assert.equal((await read('films/index.html')).match(/class="card-poster"/g)?.length, lyceum.entries.length);
  assert.doesNotMatch(index, /<script\b(?![^>]*type="application\/ld\+json")/i);
  for (const film of lyceum.entries) {
    const markdown = await read(`films/pages/${film.id}.md`);
    const html = await read(`films/${film.id}/index.html`);
    assert.match(markdown, new RegExp(`slug: ${film.id}\\n`));
    assert.match(html, /x-generator" content="blog-webcli@/);
    assert.match(html, new RegExp(`<link rel="canonical" href="https://lyceumshorts\\.com/films/${film.id}/">`));
    assert.match(html, new RegExp(`data-hls="/${film.render.hls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
    assert.match(html, new RegExp(`<track kind="captions"[^>]+src="/${film.captions.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
    assert.match(html, /<ol class="transcript">/);
    assert.match(html, /application\/ld\+json/);
  }
  assert.match(await read('about/index.html'), /Correctable, not just watchable/);
  assert.match(await read('contribute/index.html'), /A submission is a pull request/);
  assert.equal(await read('404.html'), await read('not-found/index.html'));
});

test('all generated local page and image links resolve, without reader-executable code on the index', async () => {
  const files = [];
  const walk = async (dir) => {
    for (const ent of await readdir(path.join(root, dir), { withFileTypes: true })) {
      const rel = path.posix.join(dir, ent.name);
      if (ent.isDirectory()) await walk(rel);
      else if (rel.endsWith('.html')) files.push(rel);
    }
  };
  await walk('.');
  for (const file of files) {
    const html = await read(file);
    assert.doesNotMatch(html, /\b(?:src|href)="https?:\/\/(?:cdnjs|cdn\.jsdelivr|unpkg|esm)\./i, file);
    const base = new URL(file === '404.html' ? '/' : `/${file.replace(/index\.html$/, '')}`, 'https://lyceumshorts.com');
    for (const match of html.matchAll(/\b(?:href|src|poster|data-hls)="([^"]+)"/g)) {
      const url = new URL(match[1].replace(/&amp;/g, '&'), base);
      if (url.origin !== base.origin || url.pathname.endsWith('.xml') || url.pathname === '/feed.xml') continue;
      const target = path.join(root, decodeURIComponent(url.pathname));
      const info = await stat(target).catch(() => null);
      assert.ok(info, `${file}: missing ${url.pathname}`);
      if (info.isDirectory()) assert.ok((await stat(path.join(target, 'index.html')).catch(() => null))?.isFile(), `${file}: ${url.pathname}`);
    }
  }
});
