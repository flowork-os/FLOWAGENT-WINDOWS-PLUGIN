(function ( w, d, PKAE ) {
'use strict';

setTimeout(function () {
	if (/(^|[?&])skipintro=1(&|$)/.test (w.location.search)) return ;
	var scroll_hint = 0;
	var showScrollHint = function () {
		var tbc, el, r;
		if (!PKAE.isMobile || scroll_hint) return ;
		scroll_hint = 1;
		tbc = PKAE.ui.el.getElementsByClassName ('pk_tbc')[0];
		if (!tbc || tbc.scrollWidth <= tbc.clientWidth + 2) return ;
		el = d.createElement ('i');
		r = tbc.getBoundingClientRect ();
		el.className = 'pk_tbhint';
		el.innerHTML = '&#8250;';
		el.style.top = ((r.top + r.height / 2 - 12) >> 0) + 'px';
		PKAE.ui.el.appendChild ( el );
		setTimeout (function () {
			el.parentNode && el.parentNode.removeChild ( el );
		}, 3000);
	};

	PKAudioEditor._deps.Wlc = function () {
		var body_str = 'Tips:<br/>Please keep in mind that most key shortcuts rely on the <strong>Shift + <u>key</u></strong> combo (e.g. Shift+Z for undo, Shift+C copy, Shift+X cut, etc.).<br/><br/>';

		var md = new PKSimpleModal({
			title: '<font style="font-size:15px">Welcome to X-Studio DAW</font>',
			ondestroy: function( q ) {
				PKAE.ui.InteractionHandler.on = false;
				PKAE.ui.KeyHandler.removeCallback ('modalTemp');
				showScrollHint ();
			},
			body:'<div style="overflow:auto;-webkit-overflow-scrolling:touch;max-width:580px;width:calc(100vw - 40px);max-height:calc(100vh - 340px);min-height:110px;font-size:13px; color:#95c6c6;padding-top:7px;">'+
				'X-Studio DAW is a professional Digital Audio Workstation, Multitrack Mixer, Waveform Editor, and WebAssembly DSP Suite native to X-Flow.<br />It runs entirely in-browser with zero external latency and high-speed local processing!'+
				'<br/><br/>'+
				body_str+
				'You can record audio or load files to perform trimming, cutting, fade, equalization, compression, reverb, delay, pitch/speed shifts, and multitrack mixdowns.'+
				'</div>',
			setup:function( q ) {
				PKAE.ui.InteractionHandler.checkAndSet ('modal');
				PKAE.ui.KeyHandler.addCallback ('modalTemp', function ( e ) {
					q.Destroy ();
				}, [27]);

				var scroll = q.el_body.getElementsByTagName('div')[0];
				scroll.addEventListener ('touchstart', function(e){
					e.stopPropagation ();
				}, false);
				scroll.addEventListener ('touchmove', function(e){
					e.stopPropagation ();
				}, false);
			}
		});
		md.Show ();
		var cancelBtn = document.getElementsByClassName('pk_modal_cancel')[0];
		if (cancelBtn) {
			cancelBtn.innerHTML = '&nbsp; &nbsp; &nbsp; OK &nbsp; &nbsp; &nbsp;';
		}
	};

	var change = 99;
	var exists = w.localStorage && w.localStorage.getItem ('k');

	if (!exists) {
		change = 0;
		w.localStorage && w.localStorage.setItem ('k', 1);
	}

	if ( ((Math.random () * 100) >> 0) < change) return ;
	PKAudioEditor._deps.Wlc ();

}, 320);

})( window, document, PKAudioEditor );
