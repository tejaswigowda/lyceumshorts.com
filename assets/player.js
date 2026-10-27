// Player enhancement. The page works without this (the index never needs it); this only makes HLS play
// where the browser has no native support, and makes transcript times seek the film.
( function () {

	'use strict';

	var video = document.querySelector( 'video[data-hls]' );
	if ( ! video ) return;

	var src = video.getAttribute( 'data-hls' );
	var native = video.canPlayType( 'application/vnd.apple.mpegurl' );
	var ready = Promise.resolve();

	if ( native ) {

		// Safari and iOS: the <source> in the page is already enough

	} else if ( window.Hls && window.Hls.isSupported() ) {

		var hls = new window.Hls( { capLevelToPlayerSize: true, startLevel: -1, maxBufferLength: 30 } );
		ready = new Promise( function ( resolve ) { hls.on( window.Hls.Events.MANIFEST_PARSED, resolve ); } );
		hls.loadSource( src );
		hls.attachMedia( video );
		hls.on( window.Hls.Events.ERROR, function ( _e, d ) {

			if ( ! d.fatal ) return;
			if ( d.type === window.Hls.ErrorTypes.NETWORK_ERROR ) hls.startLoad();
			else if ( d.type === window.Hls.ErrorTypes.MEDIA_ERROR ) hls.recoverMediaError();

		} );

	}

	// captions on by default
	function showCaptions() {

		for ( var i = 0; i < video.textTracks.length; i ++ ) {

			if ( video.textTracks[ i ].kind === 'captions' ) video.textTracks[ i ].mode = 'showing';

		}

	}
	showCaptions();
	video.addEventListener( 'loadedmetadata', showCaptions );

	// a transcript time seeks the film and starts it
	document.addEventListener( 'click', function ( ev ) {

		var a = ev.target.closest ? ev.target.closest( 'a[data-t]' ) : null;
		if ( ! a ) return;
		ev.preventDefault();
		var t = parseFloat( a.getAttribute( 'data-t' ) );
		ready.then( function () {

			video.currentTime = t;
			video.focus( { preventScroll: true } );
			var p = video.play();
			if ( p && p.catch ) p.catch( function () {} );

		} );

	} );

}() );
