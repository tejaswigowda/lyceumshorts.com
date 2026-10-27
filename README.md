# Lyceum Shorts

A commons of short educational films **that ship their own source**: watch one, then open the scene that made it, edit it, and read the tutorial that built it. Live at <https://lyceumshorts.com>.

The site is a thin renderer over one file, [`lyceum.json`](lyceum.json). GitHub Pages serves the root of `main`.

## Layout

| Path | What |
|---|---|
| `lyceum.json` | the single source for every film (claim, assumptions, status, checks, scene, tutorial, render, licence) |
| `index.html`, `films/<id>/index.html`, `about/`, `contribute/`, `404.html`, `sitemap.xml` | **generated** from `lyceum.json`; do not edit by hand |
| `renders/<id>/` | `master.m3u8`, `1080p60/`, `720p60/`, `480p60/` (fMP4 HLS, 6 s segments), `poster.jpg`, `captions.vtt`, `render.json` |
| `assets/` | `style.css`, `player.js`, favicon; `vendor/hls.min.js` is vendored hls.js |
| `scripts/` | `generate.mjs`, `check.mjs`, `package-render.mjs`, `sync-renders.mjs` (plain Node, no dependencies) |

Pages are committed output, so GitHub Pages serves them as they are. There is no bundler, no transpiler and no dependency to install. `generate.mjs` is a template fill: it needs Node 18+ and nothing else.

## Working on it

```sh
node scripts/generate.mjs          # rebuild the pages from lyceum.json
node scripts/check.mjs             # gates S1 to S5 + colour contrast
node scripts/check.mjs --scenes    # S6: is every render still of its scene's current version?
```

`check.mjs --scenes --write` also sets `render.stale` in `lyceum.json` for any render whose scene has changed, and the next `generate.mjs` puts a banner on that film's page.

### Adding or re-rendering a film

1. Render the scene in Strata: Render tab, Video, 1920 × 1080, 60 fps, offline mode. Keep the master out of the repo.
2. Package it, pinned to the scene commit that was rendered:
   ```sh
   node scripts/package-render.mjs <id> master.mp4 meta.json --repo owner/repo --file scene.json --commit <sha>
   ```
   (`meta.json` is `{"cues": [...]}`, the subtitle cues read from the scene.) This needs `ffmpeg` and writes `renders/<id>/`.
3. Add or edit the entry in `lyceum.json` (claim, assumptions, status, checks, colour key, scene, tutorial).
4. `node scripts/sync-renders.mjs && node scripts/generate.mjs && node scripts/check.mjs`

`scene_hash` is the SHA-256 of the scene file's bytes at the rendered commit, so anyone can recompute it with `curl` and `sha256sum`.

Renders are build artifacts: they regenerate from the scene, so history need not carry every revision. If the repository grows, move masters or old renders to Releases.

## Constraints

Zero build step for the site. Zero third-party requests: system fonts, no analytics, no embeds, the player served from here. Mobile first. The index renders without JavaScript; the player needs it except in Safari. Static only.

## Licence

Films, scenes and tutorials: CC-BY-4.0 (see each entry). `assets/vendor/hls.min.js` is Apache-2.0, see `assets/vendor/hls.js.LICENSE`.
