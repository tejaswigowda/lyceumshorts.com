#!/usr/bin/env node
// sync-renders.mjs — copy what each render says about itself (renders/<id>/render.json) into lyceum.json.
//
//   node scripts/sync-renders.mjs
//
// Sets, per entry: duration_s, captions, and the render block {hls, poster, scene_commit, scene_hash, exporter, published}.
// Everything else in lyceum.json is hand-written and left alone. Run it after scripts/package-render.mjs.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const file = path.join( root, 'lyceum.json' );
const data = JSON.parse( fs.readFileSync( file, 'utf8' ) );

for ( const e of data.entries ) {

	const jsonFile = path.join( root, 'renders', e.id, 'render.json' );
	if ( ! fs.existsSync( jsonFile ) ) { console.warn( `- ${ e.id }: no render yet` ); continue; }
	const r = JSON.parse( fs.readFileSync( jsonFile, 'utf8' ) );
	if ( r.scene.file !== e.scene.file || r.scene.repo !== e.scene.repo ) throw new Error( `${ e.id }: render.json is for ${ r.scene.repo }/${ r.scene.file }, not the entry's scene` );

	const stale = e.render && e.render.stale === true;
	const next = {};
	for ( const [ k, v ] of Object.entries( e ) ) {

		if ( k === 'render' || k === 'captions' || k === 'duration_s' ) continue;
		next[ k ] = v;
		if ( k === 'level' ) next.duration_s = Math.round( r.render.duration_s );
		if ( k === 'tutorial' ) {

			next.render = {
				hls: `renders/${ e.id }/${ r.outputs.master }`, poster: `renders/${ e.id }/${ r.outputs.poster }`,
				scene_commit: r.scene.commit, scene_hash: r.scene.hash,
				exporter: `${ r.render.master_exporter.replace( / \(.*/, '' ) } master, ${ r.render.ladder_encoder } ladder`,
				published: r.render.rendered_at.slice( 0, 10 ),
			};
			if ( stale ) next.render.stale = true;
			next.captions = `renders/${ e.id }/${ r.outputs.captions }`;

		}

	}
	Object.keys( e ).forEach( k => delete e[ k ] );
	Object.assign( e, next );
	console.log( `✓ ${ e.id }: ${ e.duration_s } s, ${ r.scene.hash.slice( 0, 19 ) }…` );

}

fs.writeFileSync( file, JSON.stringify( data, null, 2 ) + '\n' );
