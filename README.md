# Lyceum Shorts

**Migration prototype only:** editor publishing bypasses the player integration. Do not use blog-webCLI's editor to publish this checkout until the migration is redesigned.

A commons of short educational films **that ship their own source**: watch one, then open the scene that made it, edit it, and read the tutorial that built it. Live at <https://lyceumshorts.com>. This local prototype builds the static site pages with [blog-webCLI](https://blog.webcli.app/); it is not the live site.

The prototype build reads canonical Markdown and settings, invokes a commit-pinned blog-webCLI renderer, then explicitly integrates the first-party HLS player using [`lyceum.json`](lyceum.json) and the render files. GitHub Pages serves the root of `main`.

## Layout

| Path | What |
|---|---|
| `lyceum.json` | film metadata and render references used by the current player integration and checks |
| `pages/*.md`, `films/pages/<id>.md` | canonical Markdown source; builds read these files without overwriting them |
| `blog.json`, `films/blog.json` | site settings read by the build |
| `index.html`, `films/<id>/index.html`, `about/`, `contribute/`, `404.html`, `sitemap.xml` | **generated** through blog-webCLI and the site integration; do not edit by hand |
| `renders/<id>/` | `master.m3u8`, `1080p60/`, `720p60/`, `480p60/` (fMP4 HLS, 6 s segments), `poster.jpg`, `captions.vtt`, `render.json` |
| `assets/` | `style.css`, `player.js`, favicon; `vendor/hls.min.js` is vendored hls.js |
| `.blog-webcli-ref` | exact blog-webCLI commit used to build the public HTML |
| `scripts/` | `generate.mjs` (blog-webCLI adapter), `blog-webcli.mjs`, `check.mjs`, `package-render.mjs`, `sync-renders.mjs` |

Pages are committed output, so GitHub Pages serves them as they are. blog-webCLI's renderer has no package install step; the site-specific HLS scripts and the 131 MB of video remain locally served. Node 22 or newer and a checkout at the pinned renderer commit are required to rebuild.

## Working on it

```sh
git clone https://github.com/tejaswigowda/blog-webCLI.git .blog-webcli
git -C .blog-webcli checkout --detach "$(cat .blog-webcli-ref)"
npm run build                      # canonical Markdown -> blog-webCLI -> local player integration
npm test                           # generated files, S1 to S5 + colour contrast, page checks
npm run check:page                 # real Chrome page/player workflow
node scripts/check.mjs --scenes    # S6: is every render still of its scene's current version?
```

Set `BLOG_WEBCLI=/path/to/blog-webCLI` to use another checkout, but it must be clean and at the exact commit in `.blog-webcli-ref`. `check.mjs --scenes --write` also sets `render.stale` in `lyceum.json` for any render whose scene has changed. Update the stale notice in the corresponding Markdown as well; the build refuses when they disagree. See the [migration notes](https://blog.webcli.app/about/tutorials/rebuild-lyceumshorts.html) for the architecture and limits.

### Adding or re-rendering a film

1. Render the scene in Strata: Render tab, Video, 1920 × 1080, 60 fps, offline mode. Keep the master out of the repo.
2. Package it, pinned to the scene commit that was rendered:
   ```sh
   node scripts/package-render.mjs <id> master.mp4 meta.json --repo owner/repo --file scene.json --commit <sha>
   ```
   (`meta.json` is `{"cues": [...]}`, the subtitle cues read from the scene.) This needs `ffmpeg` and writes `renders/<id>/`.
3. Add or edit the entry in `lyceum.json` (claim, assumptions, status, checks, colour key, scene, tutorial), and update the corresponding film Markdown and homepage cards separately. The current content gates check `lyceum.json`, not the authored Markdown.
4. `node scripts/sync-renders.mjs && node scripts/generate.mjs && node scripts/check.mjs`

`scene_hash` is the SHA-256 of the scene file's bytes at the rendered commit, so anyone can recompute it with `curl` and `sha256sum`.

Renders are build artifacts: they regenerate from the scene, so history need not carry every revision. If the repository grows, move masters or old renders to Releases.

## Constraints

Zero third-party requests: system fonts, no analytics, no embeds, the player served from here. Mobile first. The index renders without JavaScript; the player needs it except in Safari. Static only. blog-webCLI generates the canonical page shell; the explicit site adapter restores the specialized player and Lyceum's existing VideoObject metadata.

## Licence

Films, scenes and tutorials: CC-BY-4.0 (see each entry). `assets/vendor/hls.min.js` is Apache-2.0, see `assets/vendor/hls.js.LICENSE`.
