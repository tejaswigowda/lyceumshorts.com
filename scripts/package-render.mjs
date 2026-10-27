#!/usr/bin/env node
// package-render.mjs — turn one Strata offline master (a 1080p60 .mp4) into the delivery set under renders/<id>/.
//
//   node scripts/package-render.mjs <id> <master.mp4> <meta.json> --repo tejaswigowda/test1 --file pyth.json --commit <sha> [--branch main]
//
// meta.json is {"cues":[{start,end,text}]}: the subtitle cues read from the scene as it was rendered.
// Writes   renders/<id>/{master.m3u8, poster.jpg, captions.vtt, render.json, 1080p60|720p60|480p60/{init.mp4,seg*.m4s,index.m3u8}}
// and prints the scene_hash and the numbers lyceum.json's "render" block needs. Needs ffmpeg and ffprobe on PATH.
// Renders are build artifacts: this regenerates them from the master; the master is not committed.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const args = process.argv.slice( 2 );
const opt = name => { const i = args.indexOf( '--' + name ); return i < 0 ? null : args[ i + 1 ]; };
const [ id, master, metaFile ] = args;
const repo = opt( 'repo' ), file = opt( 'file' ), commit = opt( 'commit' ), branch = opt( 'branch' ) || 'main';
const posterOnly = args.includes( '--poster-only' ), posterAt = opt( 'poster-at' );
if ( ! id || ! master || ( ! posterOnly && ( ! metaFile || ! repo || ! file || ! commit ) ) ) {

	console.error( 'usage: package-render.mjs <id> <master.mp4> <meta.json> --repo owner/name --file scene.json --commit <sha> [--branch main] [--poster-at seconds]' );
	console.error( '       package-render.mjs <id> <master.mp4> --poster-only --poster-at seconds    (replace renders/<id>/poster.jpg only)' );
	process.exit( 2 );

}

// the same ladder the Strata publish step names: 1080p at 3.5 Mbps, 720p at 1.8, 480p at 0.9 (peak rates; the encoder is CRF-capped)
const RUNGS = [
	{ name: '1080p60', width: 1920, height: 1080, kbps: 3500, level: '4.2', codec: 'avc1.64002a' },
	{ name: '720p60', width: 1280, height: 720, kbps: 1800, level: '4.0', codec: 'avc1.640028' },
	{ name: '480p60', width: 854, height: 480, kbps: 900, level: '3.2', codec: 'avc1.640020' },
];
const SEGMENT_S = 6;
const FPS = 60;

const run = ( cmd, a ) => {

	const r = spawnSync( cmd, a, { encoding: 'utf8', maxBuffer: 1 << 28 } );
	if ( r.status !== 0 ) { console.error( r.stderr ); throw new Error( `${ cmd } failed` ); }
	return r.stdout;

};

const probe = JSON.parse( run( 'ffprobe', [ '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate,nb_read_frames', '-show_entries', 'format=duration', '-of', 'json', master ] ) );
const stream = probe.streams[ 0 ];
if ( stream.width !== 1920 || stream.height !== 1080 || stream.r_frame_rate !== '60/1' ) throw new Error( `master must be 1920x1080 at 60 fps, got ${ stream.width }x${ stream.height } ${ stream.r_frame_rate }` );
const frames = Number( stream.nb_read_frames );
const durationS = frames / FPS;

const out = path.join( root, 'renders', id );
const poster = () => run( 'ffmpeg', [ '-v', 'error', '-y', '-ss', ( posterAt !== null ? Number( posterAt ) : durationS * 0.15 ).toFixed( 3 ), '-i', master, '-frames:v', '1', '-vf', 'scale=1280:720:flags=lanczos', '-q:v', '4', path.join( out, 'poster.jpg' ) ] );
if ( posterOnly ) { poster(); console.log( `poster of ${ id } written` ); process.exit( 0 ); }
fs.rmSync( out, { recursive: true, force: true } );
fs.mkdirSync( out, { recursive: true } );

const renditions = [];
for ( const r of RUNGS ) {

	const dir = path.join( out, r.name );
	fs.mkdirSync( dir );
	// a keyframe every 2 s and 6 s segments: each segment is three whole GOPs and starts on a keyframe
	run( 'ffmpeg', [
		'-v', 'error', '-y', '-i', master, '-an',
		'-vf', `scale=${ r.width }:${ r.height }:flags=lanczos,format=yuv420p`,
		'-c:v', 'libx264', '-profile:v', 'high', '-level', r.level, '-preset', 'slow', '-crf', '22',
		'-maxrate', `${ r.kbps }k`, '-bufsize', `${ r.kbps * 2 }k`,
		'-r', String( FPS ), '-g', String( FPS * 2 ), '-keyint_min', String( FPS * 2 ), '-sc_threshold', '0',
		'-f', 'hls', '-hls_time', String( SEGMENT_S ), '-hls_playlist_type', 'vod', '-hls_segment_type', 'fmp4',
		'-hls_fmp4_init_filename', 'init.mp4', '-hls_segment_filename', path.join( dir, 'seg%05d.m4s' ),
		path.join( dir, 'index.m3u8' ),
	] );
	const segs = fs.readdirSync( dir ).filter( f => f.endsWith( '.m4s' ) );
	const sizes = segs.map( f => fs.statSync( path.join( dir, f ) ).size );
	renditions.push( {
		name: r.name, width: r.width, height: r.height, bitrate_kbps: r.kbps, playlist: `${ r.name }/index.m3u8`,
		segments: segs.length, max_segment_bytes: Math.max( ...sizes ), total_bytes: sizes.reduce( ( a, b ) => a + b, 0 ),
	} );
	console.log( r.name, segs.length, 'segments, largest', ( Math.max( ...sizes ) / 1048576 ).toFixed( 2 ), 'MB' );

}

// peak bandwidth from the real segments: bytes of the largest segment over its duration, with headroom for the playlist
const peak = ( dir, nominal ) => {

	const files = fs.readdirSync( dir ).filter( f => f.endsWith( '.m4s' ) );
	const worst = Math.max( ...files.map( f => fs.statSync( path.join( dir, f ) ).size ) );
	return Math.max( Math.round( worst * 8 / SEGMENT_S ), nominal * 1000 / 4 );

};
const master_m3u8 = [ '#EXTM3U', '#EXT-X-VERSION:7', '#EXT-X-INDEPENDENT-SEGMENTS' ];
for ( const r of RUNGS ) {

	const bw = peak( path.join( out, r.name ), r.kbps );
	master_m3u8.push( `#EXT-X-STREAM-INF:BANDWIDTH=${ bw },RESOLUTION=${ r.width }x${ r.height },FRAME-RATE=${ FPS }.000,CODECS="${ r.codec }"`, `${ r.name }/index.m3u8` );

}
fs.writeFileSync( path.join( out, 'master.m3u8' ), master_m3u8.join( '\n' ) + '\n' );

// poster: the frame at 15% of the film, as the Strata publish step does, unless --poster-at names a better one
poster();

// captions
const pad = ( n, w = 2 ) => String( n ).padStart( w, '0' );
const vttTime = s => { const ms = Math.round( s * 1000 ); return `${ pad( Math.floor( ms / 3600000 ) ) }:${ pad( Math.floor( ms / 60000 ) % 60 ) }:${ pad( Math.floor( ms / 1000 ) % 60 ) }.${ pad( ms % 1000, 3 ) }`; };
const { cues } = JSON.parse( fs.readFileSync( metaFile, 'utf8' ) );
const list = cues.filter( c => String( c.text ).trim() && c.end > c.start ).sort( ( a, b ) => a.start - b.start );
const clean = t => String( t ).replace( /\r/g, '' ).replace( /\n{2,}/g, '\n' ).replace( /-->/g, '\u2192' ).trim();
fs.writeFileSync( path.join( out, 'captions.vtt' ), 'WEBVTT\n\n' + list.map( ( c, i ) => `${ i + 1 }\n${ vttTime( c.start ) } --> ${ vttTime( c.end ) }\n${ clean( c.text ) }\n` ).join( '\n' ) );

// scene_hash: sha256 of the scene file's bytes at the rendered commit
const res = await fetch( `https://raw.githubusercontent.com/${ repo }/${ commit }/${ file.split( '/' ).map( encodeURIComponent ).join( '/' ) }` );
if ( ! res.ok ) throw new Error( `cannot fetch the scene at ${ commit }: ${ res.status }` );
const sceneHash = 'sha256:' + createHash( 'sha256' ).update( Buffer.from( await res.arrayBuffer() ) ).digest( 'hex' );

const renderJson = {
	version: 1,
	scene: { repo, file, branch, commit, hash: sceneHash },
	render: {
		mode: 'offline', fps: FPS, frames, duration_s: Math.round( durationS * 1e6 ) / 1e6, width: 1920, height: 1080,
		master_exporter: 'strata-export (Render tab, offline, WebCodecs H.264)', ladder_encoder: run( 'ffmpeg', [ '-version' ] ).split( '\n' )[ 0 ].replace( /^ffmpeg version (\S+).*/, 'ffmpeg $1 + libx264' ),
		rendered_at: new Date().toISOString(),
	},
	outputs: { master: 'master.m3u8', renditions, poster: 'poster.jpg', captions: 'captions.vtt' },
	checks: {
		segments_under_20mb: renditions.every( r => r.max_segment_bytes < 20 * 1048576 ),
		frame_count_matches_duration: frames === Math.round( durationS * FPS ),
	},
};
fs.writeFileSync( path.join( out, 'render.json' ), JSON.stringify( renderJson, null, 2 ) + '\n' );
console.log( JSON.stringify( { id, scene_hash: sceneHash, duration_s: Math.round( durationS * 100 ) / 100, frames, cues: list.length, total_mb: ( renditions.reduce( ( a, r ) => a + r.total_bytes, 0 ) / 1048576 ).toFixed( 1 ) } ) );
