#!/usr/bin/env node
// check.mjs — the work order's gates, as a script.
//
//   node scripts/check.mjs             offline gates S1 to S5 and colour contrast
//   node scripts/check.mjs --scenes    also S6: fetch each scene at its branch and compare its hash with the render's
//   node scripts/check.mjs --scenes --write   as above, and set or clear render.stale in lyceum.json
//
// Exit status is 1 if any gate fails.

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, parseVtt } from './generate.mjs';

const root = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const args = process.argv.slice( 2 );
const lyceumFile = path.join( root, 'lyceum.json' );
const data = JSON.parse( fs.readFileSync( lyceumFile, 'utf8' ) );
const read = rel => fs.readFileSync( path.join( root, rel ), 'utf8' );
const exists = rel => fs.existsSync( path.join( root, rel ) );

let failures = 0;
const fail = ( gate, msg ) => { console.error( `✗ ${ gate }: ${ msg }` ); failures ++; };
const pass = ( gate, msg ) => console.log( `✓ ${ gate }: ${ msg }` );
const before = () => failures;

// ── S1: every page is generated from lyceum.json ─────────────────────────────
{
	const f0 = before();
	for ( const [ rel, content ] of build() ) {

		if ( ! exists( rel ) || read( rel ) !== content ) fail( 'S1', `${ rel } is not what lyceum.json produces (run node scripts/generate.mjs)` );

	}
	const ids = new Set( data.entries.map( e => e.id ) );
	for ( const dir of fs.readdirSync( path.join( root, 'films' ) ) ) if ( ! ids.has( dir ) ) fail( 'S1', `films/${ dir }/ has no entry in lyceum.json` );
	if ( ids.size !== data.entries.length ) fail( 'S1', 'duplicate entry ids' );
	if ( failures === f0 ) pass( 'S1', `${ data.entries.length } entry pages, the index, About and Contribute all match lyceum.json` );
}

// ── S2: epistemic fields ─────────────────────────────────────────────────────
{
	const f0 = before();
	const subjects = new Set( data.subjects.map( s => s.id ) );
	for ( const e of data.entries ) {

		const g = `S2 ${ e.id }`;
		for ( const k of [ 'id', 'title', 'subject', 'topic', 'level', 'duration_s', 'claim', 'tutorial', 'license', 'captions' ] ) if ( ! e[ k ] ) fail( g, `missing ${ k }` );
		if ( ! subjects.has( e.subject ) ) fail( g, `unknown subject ${ e.subject }` );
		if ( ! Array.isArray( e.assumptions ) || e.assumptions.length === 0 ) fail( g, 'no assumptions' );
		if ( ! [ 'demonstration', 'derivation' ].includes( e.status ) ) fail( g, `status must be demonstration or derivation, got ${ e.status }` );
		if ( ! Array.isArray( e.checks ) ) fail( g, 'checks must be an array (empty if none were run)' );
		for ( const c of e.checks || [] ) if ( ! c.what || ! ( c.samples > 0 ) ) fail( g, 'every check needs what and samples' );
		if ( ! e.scene || ! e.scene.repo || ! e.scene.file || ! e.scene.branch ) fail( g, 'scene needs repo, file, branch' );
		if ( ! e.render || ! e.render.hls || ! e.render.poster || ! /^sha256:[0-9a-f]{64}$/.test( e.render.scene_hash || '' ) || ! e.render.scene_commit || ! e.render.exporter ) fail( g, 'render needs hls, poster, scene_commit, scene_hash, exporter' );
		if ( ! Array.isArray( e.colour_key ) || e.colour_key.length === 0 ) fail( g, 'no colour_key: the transcript must say what each colour distinguishes' );
		// nothing says proof unless it proves
		if ( e.status !== 'derivation' ) {

			const claimed = [ e.title, e.topic, e.claim, ...( e.assumptions || [] ), ...( e.colour_key || [] ).map( c => c.means ) ].join( ' ' );
			if ( /\b(proof|proves?|proved|proven|QED)\b/i.test( claimed ) ) fail( g, 'says "proof" but its status is demonstration' );
			const said = parseVtt( exists( e.captions || '' ) ? read( e.captions ) : '' ).map( c => c.text ).join( ' ' );
			if ( /\b(proof|proves?|proved|proven|QED)\b/i.test( said ) ) fail( g, 'the film itself says "proof" but its status is demonstration' );

		}
		const r = exists( `renders/${ e.id }/render.json` ) ? JSON.parse( read( `renders/${ e.id }/render.json` ) ) : null;
		if ( ! r ) fail( g, 'no renders/<id>/render.json' );
		else if ( r.scene.hash !== e.render.scene_hash || r.scene.commit !== e.render.scene_commit ) fail( g, 'lyceum.json disagrees with render.json (run node scripts/sync-renders.mjs)' );

	}
	if ( failures === f0 ) pass( 'S2', 'every entry has claim, assumptions, an honest status and a colour key; none says "proof" unless it is a derivation' );
}

// ── S3: segments under 20 MB, ladder present ─────────────────────────────────
{
	const f0 = before();
	const LIMIT = 20 * 1024 * 1024;
	let segments = 0, largest = 0, total = 0;
	for ( const e of data.entries ) {

		const g = `S3 ${ e.id }`;
		if ( ! exists( e.render.hls ) ) { fail( g, `${ e.render.hls } missing` ); continue; }
		const dir = path.dirname( e.render.hls );
		const master = read( e.render.hls );
		const rungs = [ ...master.matchAll( /RESOLUTION=(\d+)x(\d+)[^\n]*\n(\S+)/g ) ].map( m => ( { h: Number( m[ 2 ] ), uri: m[ 3 ] } ) );
		for ( const h of [ 480, 720, 1080 ] ) if ( ! rungs.some( r => r.h === h ) ) fail( g, `no ${ h }p rung in master.m3u8` );
		for ( const r of rungs ) {

			if ( ! exists( `${ dir }/${ r.uri }` ) ) { fail( g, `${ r.uri } missing` ); continue; }
			const rdir = path.dirname( `${ dir }/${ r.uri }` );
			const playlist = read( `${ dir }/${ r.uri }` );
			if ( ! /#EXT-X-ENDLIST/.test( playlist ) ) fail( g, `${ r.uri } is not complete (no ENDLIST)` );
			const init = /#EXT-X-MAP:URI="([^"]+)"/.exec( playlist );
			if ( ! init || ! exists( `${ rdir }/${ init[ 1 ] }` ) ) fail( g, `${ r.uri } has no init segment on disk` );
			const uris = playlist.split( '\n' ).filter( l => l && ! l.startsWith( '#' ) );
			if ( uris.length === 0 ) fail( g, `${ r.uri } lists no segments` );
			for ( const u of uris ) {

				if ( ! exists( `${ rdir }/${ u }` ) ) { fail( g, `${ rdir }/${ u } missing` ); continue; }
				const size = fs.statSync( path.join( root, rdir, u ) ).size;
				segments ++; total += size; largest = Math.max( largest, size );
				if ( size >= LIMIT ) fail( g, `${ rdir }/${ u } is ${ ( size / 1048576 ).toFixed( 1 ) } MB, over the 20 MB cap` );

			}

		}
		if ( ! exists( e.render.poster ) ) fail( g, 'poster missing' );

	}
	if ( failures === f0 ) pass( 'S3', `${ segments } segments, largest ${ ( largest / 1048576 ).toFixed( 2 ) } MB (cap 20 MB); 480p / 720p / 1080p ladder on every entry; ${ ( total / 1048576 ).toFixed( 0 ) } MB of video in all` );
}

// ── S4: captions and transcript ──────────────────────────────────────────────
{
	const f0 = before();
	for ( const e of data.entries ) {

		const g = `S4 ${ e.id }`;
		const cues = exists( e.captions ) ? parseVtt( read( e.captions ) ) : [];
		if ( cues.length === 0 ) { fail( g, 'no captions' ); continue; }
		const html = read( `films/${ e.id }/index.html` );
		if ( ! /<track kind="captions"[^>]* default>/.test( html ) ) fail( g, 'captions are not on by default' );
		const shown = ( html.match( /<a class="ts"/g ) || [] ).length;
		if ( shown !== cues.length ) fail( g, `${ cues.length } cues but ${ shown } lines in the transcript` );
		if ( ! /What the colours mean/.test( html ) ) fail( g, 'transcript does not say what the colours mean' );

	}
	if ( failures === f0 ) pass( 'S4', 'WebVTT captions on by default, a full transcript and a colour description on every entry' );
}

// ── S5: nothing from another origin, and the index needs no script ───────────
{
	const f0 = before();
	const htmlFiles = [ 'index.html', '404.html', 'about/index.html', 'contribute/index.html', ...data.entries.map( e => `films/${ e.id }/index.html` ) ];
	const sameOrigin = u => ! /^(https?:)?\/\//i.test( u ) || /^https?:\/\/(www\.)?lyceumshorts\.com\//i.test( u );
	for ( const f of htmlFiles ) {

		const html = read( f );
		for ( const m of html.matchAll( /<(link|script|img|video|source|track|iframe|audio|embed|object)\b[^>]*>/gi ) ) {

			for ( const a of m[ 0 ].matchAll( /\b(?:src|href|poster|data|data-hls)="([^"]*)"/gi ) ) {

				const isNavLink = m[ 1 ].toLowerCase() === 'link' && /rel="canonical"/.test( m[ 0 ] );
				if ( ! sameOrigin( a[ 1 ] ) && ! isNavLink ) fail( 'S5', `${ f }: ${ m[ 1 ] } loads ${ a[ 1 ] }` );

			}

		}
		if ( /@import|url\(\s*["']?https?:/i.test( html ) ) fail( 'S5', `${ f }: inline CSS reaches another origin` );

	}
	const css = read( 'assets/style.css' );
	if ( /@import|url\(\s*["']?(https?:)?\/\//i.test( css ) ) fail( 'S5', 'style.css reaches another origin' );
	const player = read( 'assets/player.js' );
	if ( /https?:\/\//.test( player.replace( /\/\/.*$/gm, '' ) ) ) fail( 'S5', 'player.js names another origin' );
	if ( /<script\b/.test( read( 'index.html' ) ) ) fail( 'S5', 'the index carries a script: its list must render without one' );
	for ( const e of data.entries ) if ( ! read( 'index.html' ).includes( `/films/${ e.id }/` ) ) fail( 'S5', `the index does not list ${ e.id } without scripting` );
	if ( ! exists( 'assets/vendor/hls.min.js' ) ) fail( 'S5', 'hls.js is not vendored' );
	if ( failures === f0 ) pass( 'S5', 'every subresource is same-origin, hls.js is vendored, the index has no script (confirm in devtools with the cache cleared)' );
}

// ── colour contrast (WCAG 2.x) ───────────────────────────────────────────────
{
	const f0 = before();
	const css = read( 'assets/style.css' );
	const lum = hex => {

		const c = [ 1, 3, 5 ].map( i => parseInt( hex.slice( i, i + 2 ), 16 ) / 255 ).map( v => v <= 0.03928 ? v / 12.92 : ( ( v + 0.055 ) / 1.055 ) ** 2.4 );
		return 0.2126 * c[ 0 ] + 0.7152 * c[ 1 ] + 0.0722 * c[ 2 ];

	};
	const ratio = ( a, b ) => { const [ x, y ] = [ lum( a ), lum( b ) ].sort( ( p, q ) => q - p ); return ( x + 0.05 ) / ( y + 0.05 ); };
	const blocks = [ [ 'light', css.slice( css.indexOf( ':root' ), css.indexOf( '@media' ) ) ], [ 'dark', css.slice( css.indexOf( ':root', css.indexOf( '@media' ) ), css.indexOf( '* { box-sizing' ) ) ] ];
	const PAIRS = [ [ 'fg', 'bg' ], [ 'muted', 'bg' ], [ 'muted', 'surface' ], [ 'link', 'bg' ], [ 'link', 'surface' ], [ 'accent-fg', 'accent' ], [ 'accent', 'bg' ], [ 'accent', 'surface' ], [ 'fg', 'surface' ], [ 'focus', 'bg' ], [ 'demo-fg', 'demo-bg' ], [ 'deriv-fg', 'deriv-bg' ], [ 'stale-fg', 'stale-bg' ], [ 'fg', 'bg' ] ];
	let worst = 99;
	for ( const [ mode, block ] of blocks ) {

		const v = Object.fromEntries( [ ...block.matchAll( /--([a-z-]+):\s*(#[0-9a-fA-F]{6})/g ) ].map( m => [ m[ 1 ], m[ 2 ] ] ) );
		for ( const [ a, b ] of PAIRS ) {

			if ( ! v[ a ] || ! v[ b ] ) { fail( 'contrast', `${ mode }: --${ a } or --${ b } not defined` ); continue; }
			const r = ratio( v[ a ], v[ b ] );
			const need = a === 'focus' ? 3 : 4.5;
			worst = Math.min( worst, r );
			if ( r < need ) fail( 'contrast', `${ mode }: --${ a } on --${ b } is ${ r.toFixed( 2 ) }:1, needs ${ need }:1` );

		}

	}
	if ( failures === f0 ) pass( 'contrast', `light and dark themes: every text pair is at least ${ worst.toFixed( 1 ) }:1 (AA needs 4.5:1; focus ring 3:1)` );
}

// ── S6: every scene_hash matches its current scene (network) ─────────────────
if ( args.includes( '--scenes' ) ) {

	const f0 = before();
	let changed = false;
	for ( const e of data.entries ) {

		const url = `https://raw.githubusercontent.com/${ e.scene.repo }/${ e.scene.branch }/${ e.scene.file.split( '/' ).map( encodeURIComponent ).join( '/' ) }`;
		const res = await fetch( url, { headers: { 'Cache-Control': 'no-cache' } } );
		if ( ! res.ok ) { fail( 'S6', `${ e.id }: cannot fetch ${ url } (${ res.status })` ); continue; }
		const hash = 'sha256:' + createHash( 'sha256' ).update( Buffer.from( await res.arrayBuffer() ) ).digest( 'hex' );
		const isStale = hash !== e.render.scene_hash;
		if ( isStale ) fail( 'S6', `${ e.id }: STALE. The render is of ${ e.render.scene_hash.slice( 0, 19 ) }… but ${ e.scene.branch } is now ${ hash.slice( 0, 19 ) }…` );
		if ( args.includes( '--write' ) && ( e.render.stale === true ) !== isStale ) {

			if ( isStale ) e.render.stale = true; else delete e.render.stale;
			changed = true;

		}

	}
	if ( changed ) { fs.writeFileSync( lyceumFile, JSON.stringify( data, null, 2 ) + '\n' ); console.log( 'lyceum.json updated: run node scripts/generate.mjs to show the banner' ); }
	if ( failures === f0 ) pass( 'S6', 'every render matches the current version of its scene' );

}

console.log( failures ? `\n${ failures } problem${ failures === 1 ? '' : 's' }` : '\nall gates passed' );
process.exit( failures ? 1 : 0 );
