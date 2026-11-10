#!/usr/bin/env node
// generate.mjs — fill the page templates from lyceum.json. Plain Node, no dependencies, no bundler.
//
//   node scripts/generate.mjs           write index.html, films/<id>/index.html, about/, contribute/, 404.html, sitemap.xml, robots.txt
//   node scripts/generate.mjs --check   write nothing; exit 1 if any generated file differs from what lyceum.json produces
//
// Nothing about a film is written anywhere but lyceum.json (and the render files it points at). The pages are committed
// output so GitHub Pages serves them as they are and the index needs no JavaScript.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const SITE = 'https://lyceumshorts.com';
const EDITOR = 'https://strataeditor.dev/';
const REPO_URL = 'https://github.com/tejaswigowda/lyceumshorts.com';

const data = JSON.parse( fs.readFileSync( path.join( root, 'lyceum.json' ), 'utf8' ) );
// the picture a link to the site itself unfurls with: the site's own, else the first film's poster
const SITE_IMAGE = `/${ data.image || data.entries[ 0 ].render.poster }`;

const esc = s => String( s ).replace( /&/g, '&amp;' ).replace( /</g, '&lt;' ).replace( />/g, '&gt;' ).replace( /"/g, '&quot;' );
const read = rel => fs.readFileSync( path.join( root, rel ), 'utf8' );

export const subjectLabel = id => ( data.subjects.find( s => s.id === id ) || { label: id } ).label;
export const clock = s => { const t = Math.round( s ); return `${ Math.floor( t / 60 ) }:${ String( t % 60 ).padStart( 2, '0' ) }`; };
const iso = s => { const t = Math.round( s ); return `PT${ Math.floor( t / 60 ) }M${ t % 60 }S`; };

const STATUS = {
	demonstration: { label: 'Demonstration', gloss: 'Shows the relationship in particular cases. It does not prove it in general.' },
	derivation: { label: 'Derivation', gloss: 'An argument that holds for every case its assumptions cover.' },
};

export const sceneUrl = ( e, pinned = false ) =>
	`${ EDITOR }#repo=${ e.scene.repo }&file=${ encodeURIComponent( e.scene.file ) }&branch=${ e.scene.branch }${ pinned ? '&commit=' + e.render.scene_commit : '' }`;

export const parseVtt = text => text.split( /\r?\n\r?\n/ ).map( block => {

	const lines = block.split( /\r?\n/ ).filter( Boolean );
	const i = lines.findIndex( l => l.includes( '-->' ) );
	if ( i < 0 ) return null;
	const id = i > 0 ? lines[ 0 ].trim() : null;
	const [ a, b ] = lines[ i ].split( '-->' ).map( s => s.trim() ).map( s => s.split( ':' ).reduce( ( acc, n ) => acc * 60 + parseFloat( n ), 0 ) );
	return { id, start: a, end: b, text: lines.slice( i + 1 ).join( ' ' ) };

} ).filter( Boolean );

// ── shared chrome ─────────────────────────────────────────────────────────────

const page = ( { title, description, path: urlPath, body, head = '', scripts = '', image = null, jsonld = null } ) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${ esc( title ) }</title>
<meta name="description" content="${ esc( description ) }">
<link rel="canonical" href="${ SITE }${ urlPath }">
<meta property="og:title" content="${ esc( title ) }">
<meta property="og:description" content="${ esc( description ) }">
<meta property="og:type" content="website">
<meta property="og:url" content="${ SITE }${ urlPath }">
<meta property="og:site_name" content="Lyceum Shorts">
<meta property="og:image" content="${ SITE }${ image || SITE_IMAGE }">
<meta property="og:image:width" content="1280">
<meta property="og:image:height" content="720">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${ esc( title ) }">
<meta name="twitter:description" content="${ esc( description ) }">
<meta name="twitter:image" content="${ SITE }${ image || SITE_IMAGE }">
<link rel="alternate" type="application/rss+xml" title="Lyceum Shorts" href="${ SITE }/feed.xml">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/style.css">
${ head }${ jsonld ? `<script type="application/ld+json">${ JSON.stringify( jsonld ).replace( /</g, '\\u003c' ) }</script>\n` : '' }</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site">
<a class="brand" href="/">Lyceum Shorts</a>
<nav aria-label="Site">
<a href="/">Films</a>
<a href="/about/">About</a>
<a href="/contribute/">Contribute</a>
</nav>
</header>
<main id="main">
${ body }
</main>
<footer class="site">
<p>Short films that ship their own source. Films, scenes and tutorials are CC&#8209;BY&#8209;4.0 unless an entry says otherwise. <a href="${ REPO_URL }">Source of this site</a>.</p>
</footer>
${ scripts }</body>
</html>
`;

// ── index ─────────────────────────────────────────────────────────────────────

const statusBadge = e => `<span class="badge badge-${ e.status }" title="${ esc( STATUS[ e.status ].gloss ) }">${ STATUS[ e.status ].label }</span>`;

const card = e => `<li>
<article class="card">
<a class="card-poster" href="/films/${ e.id }/" tabindex="-1" aria-hidden="true"><img src="/${ e.render.poster }" alt="" width="1280" height="720" loading="lazy" decoding="async"></a>
<div class="card-body">
<h3><a href="/films/${ e.id }/">${ esc( e.title ) }</a></h3>
<p class="meta"><span>${ esc( e.topic ) }</span> <span aria-hidden="true">&middot;</span> <time datetime="${ iso( e.duration_s ) }">${ clock( e.duration_s ) }</time> <span aria-hidden="true">&middot;</span> ${ statusBadge( e ) }</p>
<p class="claim">${ esc( e.claim ) }</p>
<p class="ships"><span class="ships-label">Ships its own source:</span>
<a class="open-scene" href="${ sceneUrl( e ) }">Open the scene</a> <span aria-hidden="true">&middot;</span> <a href="${ esc( e.tutorial ) }">Tutorial</a></p>
</div>
</article>
</li>`;

function indexPage() {

	const groups = data.subjects.map( s => {

		const list = data.entries.filter( e => e.subject === s.id );
		if ( list.length === 0 ) return '';
		return `<section aria-labelledby="s-${ s.id }">
<h2 id="s-${ s.id }">${ esc( s.label ) }</h2>
<ul class="cards">
${ list.map( card ).join( '\n' ) }
</ul>
</section>`;

	} ).join( '\n' );

	const body = `<div class="intro">
<h1>Short films that ship their own source</h1>
<p class="lede">Watch one, then open the scene that made it, edit it, and read the tutorial that built it. Every one of these shows a relationship by making it geometric.</p>
<p class="legend"><strong>Demonstration</strong> shows a relationship in particular cases. <strong>Derivation</strong> argues it for every case its assumptions cover. Each film states which it is, and what it assumes.</p>
</div>
${ groups }`;

	return page( {
		title: 'Lyceum Shorts: short educational films that ship their own source',
		description: 'Short educational films in maths, biology, physics and mechanism. Each one ships the scene that made it: open it, edit it, and read the tutorial that built it.',
		path: '/', body,
	} );

}

// ── entry page ────────────────────────────────────────────────────────────────

function entryPage( e ) {

	const vttPath = `/${ e.captions }`;
	const cues = parseVtt( read( e.captions ) );
	const stale = e.render.stale === true;
	const status = STATUS[ e.status ];

	const checks = e.checks && e.checks.length > 0
		? `<ul>\n${ e.checks.map( c => `<li>${ esc( c.what ) }: ${ c.samples !== undefined ? `${ c.samples } samples` : '' }${ c.max_residual !== undefined && c.max_residual !== null ? `, largest difference ${ c.max_residual }${ c.units ? ' ' + esc( c.units ) + ' units' : '' }` : '' }${ c.note ? `. ${ esc( c.note[ 0 ].toUpperCase() + c.note.slice( 1 ) ) }` : '' }</li>` ).join( '\n' ) }\n</ul>`
		: '<p>Not formally verified. The film shows the relationship; no check was run against a formula.</p>';

	const colours = e.colour_key && e.colour_key.length > 0
		? `<h3>What the colours mean</h3>
<p>The film uses colour to carry meaning. Here is what each one distinguishes.</p>
<dl class="colours">
${ e.colour_key.map( c => `<dt>${ esc( c.colour ) }</dt><dd>${ esc( c.means ) }</dd>` ).join( '\n' ) }
</dl>`
		: '';

	const credits = e.credits && e.credits.length > 0
		? `<ul>\n${ e.credits.map( c => `<li>${ esc( c ) }</li>` ).join( '\n' ) }\n</ul>`
		: '<p>No third-party assets. Everything is built from primitives in the scene.</p>';

	// each cue is an anchor a passage can be linked by: #cue-<id from the captions file>, else its position
	const cueId = ( c, n ) => `cue-${ c.id && /^[\w-]+$/.test( c.id ) ? c.id : n + 1 }`;
	const transcript = cues.map( ( c, n ) => `<li id="${ cueId( c, n ) }"><a class="ts" href="#player" data-t="${ c.start }">${ clock( c.start ) }</a> ${ esc( c.text ) } <a class="cue-link" href="#${ cueId( c, n ) }" aria-label="Link to this passage">#</a></li>` ).join( '\n' );

	const body = `<article class="entry">
<header>
<p class="crumb"><a href="/">Films</a> <span aria-hidden="true">/</span> ${ esc( subjectLabel( e.subject ) ) }</p>
<h1>${ esc( e.title ) }</h1>
<p class="meta"><span>${ esc( subjectLabel( e.subject ) ) }: ${ esc( e.topic ) }</span> <span aria-hidden="true">&middot;</span> <span>${ esc( e.level ) }</span> <span aria-hidden="true">&middot;</span> <time datetime="${ iso( e.duration_s ) }">${ clock( e.duration_s ) }</time> <span aria-hidden="true">&middot;</span> ${ statusBadge( e ) }</p>
</header>

${ stale ? '<p class="stale" role="note"><strong>This render is out of date.</strong> The scene has changed since the film was rendered, so the film and the scene no longer match. Open the scene for the current version.</p>\n' : '' }<section id="player" class="player" aria-label="Film">
<video controls preload="none" playsinline poster="/${ e.render.poster }" data-hls="/${ e.render.hls }" width="1920" height="1080">
<source src="/${ e.render.hls }" type="application/vnd.apple.mpegurl">
<track kind="captions" srclang="en" label="English" src="${ vttPath }" default>
<p>This film needs a browser that plays HLS video. <a href="/${ e.render.hls.replace( 'master.m3u8', '720p60/index.m3u8' ) }">Playlist for a video player</a>. The full transcript is below.</p>
</video>
<noscript><p class="note">Playback needs JavaScript in most browsers. The transcript below has everything the film says.</p></noscript>
</section>

<section class="open-the-scene" aria-labelledby="open">
<h2 id="open">Open the scene</h2>
<p>The film above was rendered from a scene file. Open it in Strata: <strong>live and editable</strong>. Change a number, move a camera, break it, and watch what follows.</p>
<p><a class="button" href="${ sceneUrl( e ) }">Open the scene in Strata <span aria-hidden="true">&#8599;</span></a></p>
<p class="small">Or open <a href="${ sceneUrl( e, true ) }">the exact version that was rendered</a> (commit <code>${ esc( e.render.scene_commit.slice( 0, 7 ) ) }</code>).</p>
</section>

<section aria-labelledby="claim">
<h2 id="claim">Claim</h2>
<p class="claim-text">${ esc( e.claim ) }</p>
<p class="small"><strong>${ status.label }.</strong> ${ esc( status.gloss ) }</p>
</section>

<section aria-labelledby="assumptions">
<h2 id="assumptions">Assumptions</h2>
<ul class="assumptions">
${ e.assumptions.map( a => `<li>${ esc( a ) }</li>` ).join( '\n' ) }
</ul>
</section>

<section aria-labelledby="checked">
<h2 id="checked">How it was checked</h2>
${ checks }
</section>

<section aria-labelledby="build">
<h2 id="build">Build it yourself</h2>
<p>The tutorial builds this scene from an empty file, one pasted block at a time.</p>
<p><a class="button secondary" href="${ esc( e.tutorial ) }">Read the tutorial</a></p>
</section>

<section aria-labelledby="transcript">
<h2 id="transcript">Transcript</h2>
<p class="small">Captions are on by default in the player. Times link to that moment in the film.</p>
<ol class="transcript">
${ transcript }
</ol>
${ colours }
</section>

<section aria-labelledby="source">
<h2 id="source">Source, licence and credits</h2>
<ul>
<li>Scene: <a href="https://github.com/${ e.scene.repo }/blob/${ e.render.scene_commit }/${ e.scene.file.split( '/' ).map( encodeURIComponent ).join( '/' ) }"><code>${ esc( e.scene.repo ) }/${ esc( e.scene.file ) }</code></a> at commit <code>${ esc( e.render.scene_commit.slice( 0, 7 ) ) }</code></li>
<li>Rendered from scene hash <code>${ esc( e.render.scene_hash.slice( 0, 19 ) ) }&hellip;</code> by ${ esc( e.render.exporter ) }</li>
<li>Licence: <a href="https://creativecommons.org/licenses/by/4.0/">${ esc( e.license ) }</a></li>
</ul>
<h3>Credits</h3>
${ credits }
<p class="small">Found a mistake? <a href="https://github.com/${ e.scene.repo }/issues">Open an issue</a> or send a pull request: that is what makes these films correctable. <a href="/about/">Why that matters</a>.</p>
</section>
</article>`;

	const jsonld = {
		'@context': 'https://schema.org', '@type': 'VideoObject', name: e.title, description: e.claim,
		thumbnailUrl: `${ SITE }/${ e.render.poster }`, uploadDate: e.render.published, duration: iso( e.duration_s ),
		contentUrl: `${ SITE }/${ e.render.hls }`, embedUrl: `${ SITE }/films/${ e.id }/`, url: `${ SITE }/films/${ e.id }/`,
		learningResourceType: STATUS[ e.status ].label, about: e.topic, educationalLevel: e.level, license: 'https://creativecommons.org/licenses/by/4.0/',
		transcript: cues.map( c => c.text ).join( ' ' ), inLanguage: 'en', isAccessibleForFree: true,
	};

	return page( {
		title: `${ e.title }: ${ e.topic } | Lyceum Shorts`,
		description: e.claim, path: `/films/${ e.id }/`, body, image: `/${ e.render.poster }`, jsonld,
		scripts: '<script src="/assets/vendor/hls.min.js" defer></script>\n<script src="/assets/player.js" defer></script>\n',
	} );

}

// ── about, contribute, 404 ────────────────────────────────────────────────────

const aboutPage = () => page( {
	title: 'About | Lyceum Shorts',
	description: 'Lyceum Shorts is a commons of short educational films that ship their own source, so a wrong explainer can be fixed with a pull request.',
	path: '/about/',
	body: `<div class="prose">
<h1>About Lyceum</h1>
<p class="lede">A commons of short educational films that ship their own source.</p>
<p>Anyone can host explainer videos. Here every film comes with the scene that made it and the tutorial that built it. Watch it, open the scene in an editor, change it, and read how it was put together. You do not need the editor to learn the subject; it is there if you want it.</p>

<h2>Correctable, not just watchable</h2>
<p>A wrong explainer on any other platform stays wrong. The author may never see the comment, and the video cannot be edited, only replaced. Here the film is rendered from a scene file in a public repository. If a number is off or a claim is too strong, you open a pull request against the scene or against this site's <code>lyceum.json</code>, and the fix is reviewed in the open.</p>

<h2>What each film says about itself</h2>
<p>Every film states, on its page, in plain words:</p>
<ul>
<li><strong>The claim</strong>: one sentence about what the film shows.</li>
<li><strong>The assumptions</strong>: what it takes for granted. No air resistance, random mating, rigid parts: they are listed, not buried.</li>
<li><strong>Its status</strong>: a <em>demonstration</em> shows a relationship in particular cases; a <em>derivation</em> argues it for every case its assumptions cover. Nothing here is called a proof unless it is one.</li>
<li><strong>How it was checked</strong>: for example, that the ball's position matches the closed form to a stated residual. If nothing was checked, the page says so.</li>
</ul>

<h2>What this is not</h2>
<p>Not a video gallery, not a course platform, and not documentation for the editor. The editor's own tutorials serve people learning the tool. These films serve people learning the subject.</p>

<h2>Privacy</h2>
<p>This site makes no requests to any other origin: no analytics, no fonts, no embeds, no trackers. The video player is served from here too.</p>
<p><a href="/contribute/">Contribute a film</a></p>
</div>`,
} );

const contributePage = () => page( {
	title: 'Contribute | Lyceum Shorts',
	description: 'How to add a short to Lyceum: a pull request adding an entry to lyceum.json plus the scene, tutorial and render.',
	path: '/contribute/',
	body: `<div class="prose">
<h1>Contribute</h1>
<p class="lede">A submission is a pull request.</p>

<h2>What the pull request contains</h2>
<ol>
<li>An entry in <a href="${ REPO_URL }/blob/main/lyceum.json"><code>lyceum.json</code></a>. It is the only place a film is described; the pages are generated from it.</li>
<li>The <strong>scene</strong>, in a public repository, named in the entry's <code>scene</code> field.</li>
<li>The <strong>tutorial</strong> that builds the scene, linked from the entry.</li>
<li>The <strong>render</strong> under <code>renders/&lt;id&gt;/</code>, produced by <code>scripts/package-render.mjs</code> from a Strata offline master.</li>
</ol>

<h2>The bar</h2>
<ul>
<li>The tutorial meets the tutorial policy of the editor: it builds the film from an empty scene, and its contract states units, assumptions, whether the render was run, and that every object is named and classed.</li>
<li><strong>Claim stated</strong>: one sentence.</li>
<li><strong>Assumptions named</strong>: a visible list.</li>
<li><strong>Status honest</strong>: <code>demonstration</code> unless the film really derives the result for every case its assumptions cover.</li>
<li><strong>Checks reported</strong> where you ran them (samples and the largest residual). Leave <code>checks</code> empty if you ran none; the page will say so.</li>
<li><strong>Colour described</strong>: if colour carries meaning, say what each colour distinguishes in <code>colour_key</code>.</li>
<li><strong>Captions</strong> on every film.</li>
<li><strong>Original or openly licensed assets only</strong>, with credits listed.</li>
</ul>

<h2>Before you open it</h2>
<pre><code>node scripts/generate.mjs
node scripts/check.mjs</code></pre>
<p><code>generate.mjs</code> rebuilds the pages from <code>lyceum.json</code>; <code>check.mjs</code> runs the site's gates (every entry complete, no unearned "proof", every segment under 20 MB, captions present, no third-party requests, colour contrast) and <code>check.mjs --scenes</code> compares each render with its scene's current version.</p>
</div>`,
} );

const notFoundPage = () => page( {
	title: 'Not found | Lyceum Shorts', description: 'That page does not exist.', path: '/404.html',
	body: `<div class="prose"><h1>Not found</h1><p>That page does not exist. <a href="/">See all the films</a>.</p></div>`,
} );

// ── feed ─────────────────────────────────────────────────────────────────────
// RSS 2.0 with an enclosure per film, from the same list the index is built from. The enclosure is the HLS master (the one video
// file this site has); a podcast app that wants a plain mp4 cannot play it, a feed reader and a crawler can read the entries.

const xml = s => esc( s ).replace( /'/g, '&apos;' );
const rfc822 = d => new Date( d ).toUTCString();

function feed() {

	const items = [ ...data.entries ].sort( ( a, b ) => String( b.render.published ).localeCompare( String( a.render.published ) ) || a.id.localeCompare( b.id ) );
	const newest = items.length ? items[ 0 ].render.published : '1970-01-01';
	return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>Lyceum Shorts</title>
<link>${ SITE }/</link>
<description>Short educational films that ship their own source.</description>
<language>en</language>
<lastBuildDate>${ rfc822( newest ) }</lastBuildDate>
<atom:link href="${ SITE }/feed.xml" rel="self" type="application/rss+xml"/>
${ items.map( e => `<item>
<title>${ xml( e.title ) }</title>
<link>${ SITE }/films/${ e.id }/</link>
<guid isPermaLink="true">${ SITE }/films/${ e.id }/</guid>
<pubDate>${ rfc822( e.render.published ) }</pubDate>
<category>${ xml( subjectLabel( e.subject ) ) }</category>
<description>${ xml( `${ STATUS[ e.status ].label }: ${ e.claim }` ) }</description>
<enclosure url="${ SITE }/${ e.render.hls }" length="${ fs.statSync( path.join( root, e.render.hls ) ).size }" type="application/vnd.apple.mpegurl"/>
</item>` ).join( '\n' ) }
</channel>
</rss>
`;

}

// ── build ─────────────────────────────────────────────────────────────────────

export function build() {

	const out = new Map();
	out.set( 'index.html', indexPage() );
	for ( const e of data.entries ) out.set( `films/${ e.id }/index.html`, entryPage( e ) );
	out.set( 'about/index.html', aboutPage() );
	out.set( 'contribute/index.html', contributePage() );
	out.set( '404.html', notFoundPage() );
	const urls = [ '/', ...data.entries.map( e => `/films/${ e.id }/` ), '/about/', '/contribute/' ];
	out.set( 'sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${ urls.map( u => `<url><loc>${ SITE }${ u }</loc></url>` ).join( '\n' ) }\n</urlset>\n` );
	out.set( 'feed.xml', feed() );
	out.set( 'robots.txt', `User-agent: *\nAllow: /\nSitemap: ${ SITE }/sitemap.xml\n` );
	return out;

}

if ( process.argv[ 1 ] === fileURLToPath( import.meta.url ) ) {

	const check = process.argv.includes( '--check' );
	let drift = 0;
	for ( const [ rel, content ] of build() ) {

		const file = path.join( root, rel );
		if ( check ) {

			if ( ! fs.existsSync( file ) || fs.readFileSync( file, 'utf8' ) !== content ) { console.error( `✗ ${ rel } is not what lyceum.json produces` ); drift ++; }

		} else {

			fs.mkdirSync( path.dirname( file ), { recursive: true } );
			fs.writeFileSync( file, content );

		}

	}
	if ( check ) { if ( drift ) process.exit( 1 ); console.log( '✓ every generated file matches lyceum.json' ); }
	else console.log( `wrote ${ build().size } files` );

}
