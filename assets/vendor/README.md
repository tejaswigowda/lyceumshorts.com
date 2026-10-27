# Vendored libraries

- `hls.min.js`: [hls.js](https://github.com/video-dev/hls.js) 1.7.3, `dist/hls.min.js` from the npm package, unmodified except that the trailing `sourceMappingURL` comment is removed so the browser does not request a map. Licence: Apache-2.0, in `hls.js.LICENSE`.

Safari plays HLS natively and never uses it. Everything else needs it. It is served from this origin; no CDN.
