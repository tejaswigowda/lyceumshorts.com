import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const GENERATOR = path.resolve(process.env.BLOG_WEBCLI || path.join(ROOT, '.blog-webcli'));
const pinned = fs.readFileSync(path.join(ROOT, '.blog-webcli-ref'), 'utf8').trim();
if (!fs.existsSync(path.join(GENERATOR, 'lib/blog.js'))) {
  throw new Error('blog-webCLI is missing: clone it into .blog-webcli and check out .blog-webcli-ref, or set BLOG_WEBCLI');
}
const head = execFileSync('git', ['-C', GENERATOR, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (head !== pinned) throw new Error(`blog-webCLI must be at ${pinned}, not ${head}`);
const changes = execFileSync('git', ['-C', GENERATOR, 'status', '--porcelain', '--', 'lib', 'vendor'], { encoding: 'utf8' }).trim();
if (changes) throw new Error('blog-webCLI has modified runtime files; use a clean, pinned checkout');

export const { buildSite } = await import(pathToFileURL(path.join(GENERATOR, 'lib/blog.js')));
