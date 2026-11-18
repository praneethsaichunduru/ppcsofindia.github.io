/* Helpers shared by the Know About PPCs prototypes (plain JavaScript, no jQuery). */
(function () {
	'use strict';
	var STATES = window.KA_DATA.states;
	var CAT1 = { 'GPO-PB': 1, 'GPO': 1, 'PB': 1, 'HO-PB': 1, 'HO': 1 };
	var CATS = {
		1: { label: 'GPO / HO / PB', note: 'General and head post offices, philatelic bureaus' },
		2: { label: 'Sub post office', note: 'SO' },
		3: { label: 'Branch post office', note: 'BO' },
		4: { label: 'MDG / other', note: 'Mukhya Dak Ghar or rank not known' }
	};
	var KNOWN = { 'GPO-PB': 1, 'GPO': 1, 'PB': 1, 'HO-PB': 1, 'HO': 1, 'SO': 1, 'BO': 1, 'MDG': 1, 'MDG-SO': 1 };
	var REGIONS = ['North', 'Central', 'West', 'South', 'East', 'North-East', 'Islands'];

	function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
	function catOf(rank) {
		if (CAT1[rank]) return 1;
		if (rank === 'SO' || rank === 'MDG-SO') return 2;
		if (rank === 'BO') return 3;
		return 4;
	}
	function rankLabel(rank) { return KNOWN[rank] ? rank : 'Other'; }
	function card(e) {
		var c = catOf(e.k);
		return '<a class="kcard c' + c + '" href="../../blog/' + esc(e.h) + '">' +
			'<span class="thumb"><img loading="lazy" src="../../pictures/ppcs/' + esc(e.i) + '" alt="' + esc(e.n) + '" onerror="this.parentNode.classList.add(\'noimg\')"></span>' +
			'<span class="body"><b>' + esc(e.n) + '</b><small>' + esc(e.o) + ' &middot; ' + esc(e.p) + '</small>' +
			'<span class="meta"><span class="badge">' + esc(rankLabel(e.k)) + '</span><span>' + esc(e.d) + '</span></span></span></a>';
	}
	/** Share of each rank category, as a small stacked bar. */
	function mix(items) {
		var n = [0, 0, 0, 0, 0];
		items.forEach(function (e) { n[catOf(e.k)]++; });
		var t = items.length || 1;
		return '<span class="mix" title="' + [1, 2, 3, 4].map(function (c) { return CATS[c].label + ': ' + n[c]; }).join(' / ') + '">' +
			[1, 2, 3, 4].map(function (c) { return n[c] ? '<i class="c' + c + '" style="width:' + (n[c] / t * 100) + '%"></i>' : ''; }).join('') + '</span>';
	}
	function allItems() {
		var out = [];
		STATES.forEach(function (s) { s.items.forEach(function (e) { out.push({ e: e, s: s.name, r: s.region }); }); });
		return out;
	}
	function $(id) { return document.getElementById(id); }
	function debounce(fn, ms) { var t; return function () { var a = arguments; clearTimeout(t); t = setTimeout(function () { fn.apply(null, a); }, ms); }; }
	var total = STATES.reduce(function (n, s) { return n + s.items.length; }, 0);
	window.KA = { STATES: STATES, CATS: CATS, REGIONS: REGIONS, esc: esc, catOf: catOf, card: card, mix: mix, allItems: allItems, $: $, debounce: debounce, total: total };
})();
