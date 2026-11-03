/* ==========================================================================
   PPCs of India — dashboard
   --------------------------------------------------------------------------
   Reads the PPC list (live from list-pincode.html when served over http(s),
   otherwise from the data/ppc-data.js snapshot) and draws a histogram, line
   or scatter chart of releases by year, broken down overall / by status / by
   state. Hovering (or tapping) a year shows that year's releases per state.
   Charts are plain SVG: no libraries, nothing leaves the page.
   ========================================================================== */
(function () {
	'use strict';

	var STATUSES = ['Working', 'Doubtful', 'Removed', 'Replaced'];
	var PALETTE = ['#2563eb', '#e11d48', '#16a34a', '#f59e0b', '#7c3aed', '#0891b2', '#db2777', '#65a30d'];
	var OTHER = '#94a3b8';
	var ACCENT = 'var(--accent, #0b5cab)';
	var NS = 'http://www.w3.org/2000/svg';

	var S = { chart: 'hist', group: 'overall', measure: 'year', statuses: new Set(STATUSES), states: new Set(), from: 0, to: 0, showAll: false };
	var rows = [], minY = 0, maxY = 0, stateNames = [], model = null, lastWidth = 0;

	function $(id) { return document.getElementById(id); }
	function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
	function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
	function stColor(s) { return 'var(--st-' + s + ')'; }

	/* ------------------------------------------------------------- data */

	function mk(a) {
		var m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(a[1]);
		return { name: a[0], dateText: a[1], d: m ? +m[1] : 0, m: m ? +m[2] : 0, y: m ? +m[3] : null, po: a[2], district: a[3], state: a[4], pin: a[5], status: a[6] };
	}

	function parseDoc(doc) {
		return Array.prototype.map.call(doc.querySelectorAll('#ppcTable tbody tr.data-row'), function (tr) {
			var c = tr.cells, t = function (i) { return c[i].textContent.replace(/\s+/g, ' ').trim(); };
			var status = STATUSES.filter(function (s) { return tr.classList.contains(s); })[0] || 'Working';
			return mk([t(1), t(2), t(3), t(4), t(5), t(6), status]);
		});
	}

	function load() {
		function snapshot() { return { rows: (window.PPC_DATA || []).map(mk), live: false }; }
		if (!/^https?:$/.test(location.protocol)) return Promise.resolve(snapshot());
		return fetch('list-pincode.html', { cache: 'no-cache' })
			.then(function (r) { if (!r.ok) throw new Error('http'); return r.text(); })
			.then(function (t) {
				var parsed = parseDoc(new DOMParser().parseFromString(t, 'text/html'));
				if (!parsed.length) throw new Error('empty');
				return { rows: parsed, live: true };
			})
			.catch(snapshot);
	}

	function dated() { return rows.filter(function (r) { return r.y !== null; }); }
	function dateVal(r) { return r.y * 10000 + r.m * 100 + r.d; }

	function filterRows(ignoreStates) {
		return rows.filter(function (r) {
			return r.y !== null && S.statuses.has(r.status) && r.y >= S.from && r.y <= S.to &&
				(ignoreStates || S.states.size === 0 || S.states.has(r.state));
		});
	}

	/* ------------------------------------------------------------- headline figures */

	function renderKpis() {
		var d = dated(), byYear = {}, states = {};
		rows.forEach(function (r) { states[r.state] = 1; });
		d.forEach(function (r) { byYear[r.y] = (byYear[r.y] || 0) + 1; });
		var peak = Object.keys(byYear).sort(function (a, b) { return byYear[b] - byYear[a]; })[0];
		var latest = d.slice().sort(function (a, b) { return dateVal(b) - dateVal(a); })[0];
		var count = function (s) { return rows.filter(function (r) { return r.status === s; }).length; };

		var tiles = [
			['Total PPCs', rows.length, d.length + ' with a release date', null],
			['Working', count('Working'), 'in use today', stColor('Working')],
			['Doubtful', count('Doubtful'), 'status unconfirmed', stColor('Doubtful')],
			['Removed', count('Removed'), 'no longer in use', stColor('Removed')],
			['Replaced', count('Replaced'), 'superseded by a new design', stColor('Replaced')],
			['States / UTs', Object.keys(states).length, 'with at least one PPC', null],
			['Latest release', latest ? latest.dateText : '–', latest ? latest.name : '', null],
			['Peak year', peak || '–', peak ? plural(byYear[peak], 'release') : '', null]
		];
		$('kpis').innerHTML = tiles.map(function (t) {
			return '<div class="kpi"' + (t[3] ? ' style="--kpi:' + t[3] + '"' : '') + '><div class="k-label">' + esc(t[0]) +
				'</div><div class="k-value">' + esc(t[1]) + '</div><div class="k-sub">' + esc(t[2]) + '</div></div>';
		}).join('');
	}

	/* ------------------------------------------------------------- data model for the chart */

	function build() {
		var rs = filterRows(false), years = [], y;
		for (y = S.from; y <= S.to; y++) years.push(y);
		var info = years.map(function () { return { n: 0, byState: {}, byStatus: {} }; });
		rs.forEach(function (r) {
			var f = info[r.y - S.from];
			f.n++;
			f.byState[r.state] = (f.byState[r.state] || 0) + 1;
			f.byStatus[r.status] = (f.byStatus[r.status] || 0) + 1;
		});

		var scatter = S.chart === 'scatter', series = [];
		function add(key, color, pred) {
			var v = years.map(function () { return 0; }), total = 0;
			rs.forEach(function (r) { if (pred(r)) { v[r.y - S.from]++; total++; } });
			if (total) series.push({ key: key, color: color, v: v, total: total });
		}
		if (S.group === 'overall') {
			add('All PPCs', ACCENT, function () { return true; });
		} else if (S.group === 'status') {
			STATUSES.forEach(function (s) { add(s, stColor(s), function (r) { return r.status === s; }); });
		} else {
			var tally = {};
			rs.forEach(function (r) { tally[r.state] = (tally[r.state] || 0) + 1; });
			var ranked = Object.keys(tally).sort(function (a, b) { return tally[b] - tally[a]; });
			var keep = scatter || ranked.length <= 9 ? ranked : ranked.slice(0, 8);
			keep.forEach(function (st, i) { add(st, scatter ? ACCENT : PALETTE[i % PALETTE.length], function (r) { return r.state === st; }); });
			if (keep.length < ranked.length) add('Other states', OTHER, function (r) { return keep.indexOf(r.state) < 0; });
		}

		var cum = S.measure === 'cum' && !scatter, cumTotal = [], run = 0;
		info.forEach(function (f) { run += f.n; cumTotal.push(run); });
		if (cum) {
			series.forEach(function (s) { var acc = 0; s.v = s.v.map(function (n) { acc += n; return acc; }); });
		}
		return { rs: rs, years: years, info: info, series: series, cum: cum, cumTotal: cumTotal };
	}

	/* ------------------------------------------------------------- chart */

	function el(tag, attrs, parent) {
		var e = document.createElementNS(NS, tag);
		Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
		if (parent) parent.appendChild(e);
		return e;
	}

	function niceStep(raw) {
		var p = Math.pow(10, Math.floor(Math.log10(raw)));
		return [1, 2, 5, 10].map(function (k) { return k * p; }).filter(function (v) { return v >= raw; })[0];
	}

	function describe() {
		var st = S.statuses.size === STATUSES.length ? 'all statuses' : Array.from(S.statuses).join(', ') || 'no status';
		var sts = S.states.size === 0 ? 'all states/UTs' : S.states.size <= 3 ? Array.from(S.states).join(', ') : S.states.size + ' states/UTs';
		return S.from + '–' + S.to + ' · ' + st + ' · ' + sts + ' · ' + plural(model.rs.length, 'PPC');
	}

	function renderLegend() {
		var box = $('legend');
		if (S.chart === 'scatter' && S.group === 'state') {
			box.innerHTML = '<span>Bubble size = releases in that year</span>';
			return;
		}
		box.innerHTML = model.series.map(function (s) {
			return '<span><i style="background:' + s.color + '"></i>' + esc(s.key) + ' (' + s.total + ')</span>';
		}).join('') + (S.chart === 'scatter' ? '<span>Bubble size = releases</span>' : '');
	}

	function tipHTML(i, j) {
		var inf = model.info[i], yr = model.years[i];
		var head = '<div class="t-h">' + yr + '<span>' + plural(inf.n, 'release') +
			(model.cum || S.measure === 'cum' ? ' · ' + model.cumTotal[i] + ' to date' : '') + '</span></div>';
		if (!inf.n) return head + '<div class="t-title">No releases this year</div>';

		var h = head;
		if (j !== null && model.series[j]) {
			var s = model.series[j];
			h += '<div class="t-row t-focus"><span><i style="background:' + s.color + '"></i> ' + esc(s.key) + '</span><b>' + s.v[i] + '</b></div>' +
				'<div class="t-row"><span>Share of ' + yr + '’s releases</span><b>' + Math.round(s.v[i] / inf.n * 100) + '%</b></div>';
		}
		h += '<div class="t-sec"><div class="t-title">By status</div>' + STATUSES.filter(function (s) { return inf.byStatus[s]; }).map(function (s) {
			return '<div class="t-row"><span><i style="background:' + stColor(s) + '"></i> ' + s + '</span><b>' + inf.byStatus[s] + '</b></div>';
		}).join('') + '</div>';

		var list = Object.keys(inf.byState).sort(function (a, b) { return inf.byState[b] - inf.byState[a] || a.localeCompare(b); });
		h += '<div class="t-sec"><div class="t-title">By state / UT</div>' + list.slice(0, 8).map(function (st) {
			return '<div class="t-row"><span>' + esc(st) + '</span><b>' + inf.byState[st] + '</b></div>';
		}).join('');
		if (list.length > 8) h += '<div class="t-title">+' + (list.length - 8) + ' more</div>';
		return h + '</div><div class="t-hint">' + (list.length > 8 ? 'Click for the full list' : 'Click for details') + '</div>';
	}

	function draw() {
		var box = $('chart'), tip = $('tip');
		Array.prototype.slice.call(box.querySelectorAll('svg, .chart-empty')).forEach(function (n) { n.remove(); });
		tip.hidden = true;
		model = build();
		var scatter = S.chart === 'scatter';

		$('chartTitle').textContent = scatter ? 'Releases by year' + (S.group === 'overall' ? '' : ' and ' + (S.group === 'state' ? 'state/UT' : 'status'))
			: (model.cum ? 'Running total of PPCs' : 'PPCs released per year') + (S.group === 'overall' ? '' : ' by ' + (S.group === 'state' ? 'state/UT' : 'status'));
		$('chartSub').textContent = describe();
		renderLegend();

		if (!model.rs.length) {
			var empty = document.createElement('div');
			empty.className = 'chart-empty';
			empty.textContent = 'No releases match the current filters.';
			box.appendChild(empty);
			return;
		}

		var W = Math.max(box.clientWidth, 300), nS = model.series.length, n = model.years.length;
		lastWidth = box.clientWidth;
		var rowH = S.group === 'state' ? 22 : 56;
		var H = scatter ? Math.max(220, 46 + nS * rowH) : (W < 560 ? 300 : 400);
		var labelW = scatter ? (S.group === 'state' ? (W < 560 ? 96 : 150) : 78) : 46;
		var m = { l: labelW, r: 14, t: 12, b: 30 };
		var pw = W - m.l - m.r, ph = H - m.t - m.b, band = pw / n;
		var xc = function (i) { return m.l + band * (i + 0.5); };
		var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': $('chartTitle').textContent }, box);

		// X axis: years
		var xs = niceStep(Math.max(1, 34 / band));
		model.years.forEach(function (yr, i) {
			if (yr % xs) return;
			el('line', { x1: xc(i), x2: xc(i), y1: m.t, y2: m.t + ph, class: 'g-grid' }, svg);
			el('text', { x: xc(i), y: H - m.b + 17, 'text-anchor': 'middle', class: 'g-tick' }, svg).textContent = yr;
		});

		var yOf, dots = null, radius = null, rowY = null;
		if (scatter) {
			var rh = ph / nS;
			var maxChars = Math.floor((labelW - 10) / 6.2);
			var maxV = 1;
			model.series.forEach(function (s) { s.v.forEach(function (v) { if (v > maxV) maxV = v; }); });
			var maxR = Math.min(band * 0.9, rh * 0.46, 16);
			radius = function (v) { return Math.max(2.5, Math.sqrt(v / maxV) * maxR); };
			rowY = function (j) { return m.t + rh * (j + 0.5); };
			model.series.forEach(function (s, j) {
				var cy = m.t + rh * (j + 0.5);
				el('line', { x1: m.l, x2: W - m.r, y1: cy, y2: cy, class: 'g-grid' }, svg);
				var label = s.key.length > maxChars ? s.key.slice(0, maxChars - 1) + '…' : s.key;
				el('text', { x: m.l - 8, y: cy + 4, 'text-anchor': 'end', class: 'g-tick' }, svg).textContent = label;
				s.v.forEach(function (v, i) {
					if (!v) return;
					el('circle', { cx: xc(i), cy: cy, r: radius(v), style: 'fill:' + s.color + ';fill-opacity:.65;stroke:' + s.color }, svg);
				});
			});
		} else {
			var maxVal = 1;
			if (S.chart === 'hist') {
				for (var i = 0; i < n; i++) {
					var sum = 0;
					model.series.forEach(function (s) { sum += s.v[i]; });
					if (sum > maxVal) maxVal = sum;
				}
			} else {
				model.series.forEach(function (s) { s.v.forEach(function (v) { if (v > maxVal) maxVal = v; }); });
			}
			var step = niceStep(Math.max(1, maxVal / 5)), top = Math.ceil(maxVal / step) * step;
			yOf = function (v) { return m.t + ph - v / top * ph; };
			for (var t = 0; t <= top; t += step) {
				el('line', { x1: m.l, x2: W - m.r, y1: yOf(t), y2: yOf(t), class: 'g-grid' }, svg);
				el('text', { x: m.l - 6, y: yOf(t) + 4, 'text-anchor': 'end', class: 'g-tick' }, svg).textContent = t;
			}
			if (S.chart === 'hist') {
				var bw = Math.max(1, band * 0.78);
				for (var k = 0; k < n; k++) {
					var acc = 0;
					model.series.forEach(function (s) {
						var v = s.v[k];
						if (!v) return;
						el('rect', { x: xc(k) - bw / 2, y: yOf(acc + v), width: bw, height: yOf(acc) - yOf(acc + v), style: 'fill:' + s.color }, svg);
						acc += v;
					});
				}
			} else {
				model.series.forEach(function (s) {
					var pts = s.v.map(function (v, i) { return xc(i).toFixed(1) + ',' + yOf(v).toFixed(1); });
					if (S.group === 'overall') {
						el('polygon', { points: xc(0).toFixed(1) + ',' + yOf(0) + ' ' + pts.join(' ') + ' ' + xc(n - 1).toFixed(1) + ',' + yOf(0), style: 'fill:' + s.color + ';fill-opacity:.12' }, svg);
					}
					el('polyline', { points: pts.join(' '), style: 'fill:none;stroke-width:2;stroke-linejoin:round;stroke:' + s.color }, svg);
					if (band >= 7) {
						s.v.forEach(function (v, i) { if (v) el('circle', { cx: xc(i), cy: yOf(v), r: 2.5, style: 'fill:' + s.color }, svg); });
					}
				});
				dots = el('g', {}, svg);
			}
		}
		el('line', { x1: m.l, x2: W - m.r, y1: m.t + ph, y2: m.t + ph, class: 'g-axis' }, svg);
		el('line', { x1: m.l, x2: m.l, y1: m.t, y2: m.t + ph, class: 'g-axis' }, svg);

		// Hover / tap: highlight the year and show its releases
		var hov = el('rect', { class: 'g-hover', x: m.l, y: m.t, width: band, height: ph, visibility: 'hidden' }, svg);
		var overlay = el('rect', { x: m.l, y: m.t, width: pw, height: ph, fill: 'transparent' }, svg);

		var ring = scatter ? el('circle', { fill: 'none', visibility: 'hidden', style: 'stroke:var(--text-strong,#0d1b2a);stroke-width:2;pointer-events:none' }, svg) : null;

		function locate(e) {
			var r = svg.getBoundingClientRect(), k = W / r.width;
			var px = (e.clientX - r.left) * k, py = (e.clientY - r.top) * k;
			return {
				i: Math.max(0, Math.min(n - 1, Math.floor((px - m.l) / band))),
				j: scatter ? Math.max(0, Math.min(nS - 1, Math.floor((py - m.t) / (ph / nS)))) : null
			};
		}
		function show(e) {
			var p = locate(e), i = p.i, j = p.j;
			hov.setAttribute('x', m.l + band * i);
			hov.setAttribute('visibility', 'visible');
			if (ring) {
				var v = model.series[j].v[i];
				if (v) {
					ring.setAttribute('cx', xc(i));
					ring.setAttribute('cy', rowY(j));
					ring.setAttribute('r', radius(v) + 2.5);
					ring.setAttribute('visibility', 'visible');
				} else {
					ring.setAttribute('visibility', 'hidden');
				}
			}
			if (dots) {
				dots.textContent = '';
				model.series.forEach(function (s) {
					el('circle', { cx: xc(i), cy: yOf(s.v[i]), r: 4.5, style: 'fill:' + s.color + ';stroke:var(--surface-card,#fff);stroke-width:2' }, dots);
				});
			}
			tip.innerHTML = tipHTML(i, j);
			tip.hidden = false;
			var b = box.getBoundingClientRect();
			var left = e.clientX - b.left + 14, topPx = e.clientY - b.top + 14;
			if (left + tip.offsetWidth > box.clientWidth) left = e.clientX - b.left - tip.offsetWidth - 14;
			tip.style.left = Math.max(0, left) + 'px';
			tip.style.top = Math.max(0, Math.min(topPx, box.clientHeight - tip.offsetHeight)) + 'px';
		}
		function hide() {
			tip.hidden = true;
			hov.setAttribute('visibility', 'hidden');
			if (dots) dots.textContent = '';
			if (ring) ring.setAttribute('visibility', 'hidden');
		}
		var tappedYear = -1;
		overlay.addEventListener('pointermove', show);
		overlay.addEventListener('pointerdown', show);
		overlay.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hide(); });
		// Click opens the full details. On touch, the first tap only shows the tooltip.
		overlay.addEventListener('click', function (e) {
			var p = locate(e);
			if (e.pointerType === 'touch' && tappedYear !== p.i) { tappedYear = p.i; return; }
			tappedYear = -1;
			openDetail(p.i, p.j);
		});
	}

	/* ------------------------------------------------------------- full details pop-up */

	function openDetail(i, j) {
		var yr = model.years[i], inf = model.info[i], dlg = $('detail');
		$('dlgTitle').textContent = yr + ' — ' + plural(inf.n, 'release');
		var h = '<p class="p-sub">' + esc(describe().replace(/^\d{4}–\d{4} · /, '').replace(/ · \d+ PPCs?$/, '')) + '</p>';
		if (!inf.n) {
			$('dlgBody').innerHTML = h + '<p>No releases this year.</p>';
		} else {
			if (j !== null && model.series[j]) {
				var s = model.series[j];
				h += '<p class="dlg-focus"><i style="background:' + s.color + '"></i> <b>' + esc(s.key) + '</b>: ' + plural(s.v[i], 'release') +
					' (' + Math.round(s.v[i] / inf.n * 100) + '% of ' + yr + ')</p>';
			}
			h += '<div class="dlg-chips">' + STATUSES.filter(function (st) { return inf.byStatus[st]; }).map(function (st) {
				return '<span><i style="background:' + stColor(st) + '"></i>' + st + ' <b>' + inf.byStatus[st] + '</b></span>';
			}).join('') + '</div>';

			var states = Object.keys(inf.byState).sort(function (a, b) { return inf.byState[b] - inf.byState[a] || a.localeCompare(b); });
			h += '<h4>By state / UT (' + states.length + ')</h4><ul class="rank dlg-states">' + states.map(function (st) {
				return '<li style="cursor:default"><span>' + esc(st) + '</span><span class="bar"><i style="width:' + (inf.byState[st] / inf.byState[states[0]] * 100) +
					'%;background:var(--accent,#0b5cab)"></i></span><span class="num">' + inf.byState[st] + '</span></li>';
			}).join('') + '</ul>';

			var list = model.rs.filter(function (r) { return r.y === yr; }).sort(function (a, b) { return dateVal(a) - dateVal(b) || a.state.localeCompare(b.state); });
			h += '<h4>PPCs released in ' + yr + '</h4><ul class="recent">' + list.map(function (r) {
				return '<li><span class="dot" style="background:' + stColor(r.status) + '" title="' + r.status + '"></span><span>' + esc(r.name) +
					'<br><span class="meta">' + esc(r.state) + ' · ' + esc(r.district) + ' · ' + esc(r.pin) + '</span></span><time>' + esc(r.dateText) + '</time></li>';
			}).join('') + '</ul>';
			$('dlgBody').innerHTML = h;
		}
		$('tip').hidden = true;
		if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
		$('dlgBody').scrollTop = 0;
	}

	/* ------------------------------------------------------------- side cards */

	function renderRank() {
		var rs = filterRows(true), by = {};
		rs.forEach(function (r) {
			var o = by[r.state] || (by[r.state] = { total: 0, st: {} });
			o.total++;
			o.st[r.status] = (o.st[r.status] || 0) + 1;
		});
		var names = Object.keys(by).sort(function (a, b) { return by[b].total - by[a].total || a.localeCompare(b); });
		var shown = S.showAll ? names : names.slice(0, 10), max = names.length ? by[names[0]].total : 1;
		$('rank').innerHTML = shown.map(function (st) {
			var o = by[st];
			var bar = STATUSES.filter(function (s) { return o.st[s]; }).map(function (s) {
				return '<i style="width:' + (o.st[s] / max * 100) + '%;background:' + stColor(s) + '" title="' + s + ': ' + o.st[s] + '"></i>';
			}).join('');
			return '<li data-state="' + esc(st) + '" class="' + (S.states.has(st) ? 'on' : '') + '"><span>' + esc(st) + '</span><span class="bar">' + bar + '</span><span class="num">' + o.total + '</span></li>';
		}).join('') || '<li style="cursor:default">No releases match the current filters.</li>';
		var more = $('rankMore');
		more.hidden = names.length <= 10;
		more.textContent = S.showAll ? 'Show top 10' : 'Show all ' + names.length;
	}

	function renderRecent() {
		var list = filterRows(false).sort(function (a, b) { return dateVal(b) - dateVal(a); }).slice(0, 8);
		$('recent').innerHTML = list.map(function (r) {
			return '<li><span class="dot" style="background:' + stColor(r.status) + '" title="' + r.status + '"></span><span>' + esc(r.name) +
				'<br><span class="meta">' + esc(r.state) + ' · ' + esc(r.district) + ' · ' + esc(r.pin) + '</span></span><time>' + esc(r.dateText) + '</time></li>';
		}).join('') || '<li>No releases match the current filters.</li>';
	}

	/* ------------------------------------------------------------- controls */

	function updateSummary() {
		$('stateSummary').textContent = S.states.size === 0 ? 'All states' : S.states.size === 1 ? Array.from(S.states)[0] : S.states.size + ' states selected';
		Array.prototype.forEach.call($('stateList').querySelectorAll('input[data-state]'), function (c) { c.checked = S.states.has(c.dataset.state); });
	}

	function refresh() {
		Array.prototype.forEach.call(document.querySelectorAll('.seg'), function (seg) {
			Array.prototype.forEach.call(seg.querySelectorAll('button'), function (b) {
				b.setAttribute('aria-pressed', S[seg.dataset.key] === b.dataset.v);
			});
		});
		var cumBtn = document.querySelector('.seg[data-key="measure"] button[data-v="cum"]');
		cumBtn.disabled = S.chart === 'scatter';
		cumBtn.title = S.chart === 'scatter' ? 'Not available for the scatter chart' : '';
		updateSummary();
		draw();
		renderRank();
		renderRecent();
	}

	function toggleState(st) {
		if (S.states.has(st)) S.states.delete(st); else S.states.add(st);
		refresh();
	}

	function setupControls() {
		$('statusChecks').innerHTML = STATUSES.map(function (s) {
			return '<label class="' + s + '"><input type="checkbox" value="' + s + '" checked> ' + s + '</label>';
		}).join('');
		$('statusChecks').addEventListener('change', function (e) {
			if (e.target.checked) S.statuses.add(e.target.value); else S.statuses.delete(e.target.value);
			refresh();
		});

		$('stateList').innerHTML = '<div class="sl-tools"><button type="button" class="link-btn" id="statesClear">Clear selection</button></div>' +
			stateNames.map(function (st) {
				return '<label><input type="checkbox" data-state="' + esc(st) + '"> ' + esc(st) + '</label>';
			}).join('');
		$('stateList').addEventListener('change', function (e) {
			if (e.target.dataset.state) toggleState(e.target.dataset.state);
		});
		$('statesClear').addEventListener('click', function () { S.states.clear(); refresh(); });
		document.addEventListener('click', function (e) {
			var d = $('statePick');
			if (d.open && !e.composedPath().includes(d)) d.open = false;
		});

		Array.prototype.forEach.call(document.querySelectorAll('.seg'), function (seg) {
			seg.addEventListener('click', function (e) {
				var b = e.target.closest('button');
				if (!b || b.disabled) return;
				S[seg.dataset.key] = b.dataset.v;
				refresh();
			});
		});

		var from = $('yearFrom'), to = $('yearTo');
		for (var y = minY; y <= maxY; y++) { from.add(new Option(y, y)); to.add(new Option(y, y)); }
		from.value = minY;
		to.value = maxY;
		function years() {
			S.from = +from.value;
			S.to = +to.value;
			if (S.from > S.to) { S.to = S.from; to.value = S.to; }
			refresh();
		}
		from.addEventListener('change', years);
		to.addEventListener('change', years);

		$('rank').addEventListener('click', function (e) {
			var li = e.target.closest('li[data-state]');
			if (li) toggleState(li.dataset.state);
		});
		$('rankMore').addEventListener('click', function () { S.showAll = !S.showAll; renderRank(); });

		$('resetAll').addEventListener('click', function () {
			S.chart = 'hist'; S.group = 'overall'; S.measure = 'year'; S.showAll = false;
			S.statuses = new Set(STATUSES); S.states.clear();
			S.from = minY; S.to = maxY;
			from.value = minY; to.value = maxY;
			Array.prototype.forEach.call($('statusChecks').querySelectorAll('input'), function (c) { c.checked = true; });
			refresh();
		});

		var dlg = $('detail');
		$('dlgClose').addEventListener('click', function () { dlg.close(); });
		dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); }); // backdrop click

		// Touch: tapping outside the chart dismisses the tooltip
		document.addEventListener('pointerdown', function (e) {
			if (!$('chart').contains(e.target)) $('tip').hidden = true;
		});

		var pending = 0;
		var watch = function () {
			cancelAnimationFrame(pending);
			pending = requestAnimationFrame(function () { if ($('chart').clientWidth !== lastWidth) draw(); });
		};
		if (window.ResizeObserver) new ResizeObserver(watch).observe($('chart')); else window.addEventListener('resize', watch);
	}

	/* ------------------------------------------------------------- start */

	load().then(function (res) {
		rows = res.rows;
		var d = dated();
		if (!d.length) {
			$('dashSub').textContent = 'No PPC data could be loaded.';
			return;
		}
		minY = Math.min.apply(null, d.map(function (r) { return r.y; }));
		maxY = Math.max.apply(null, d.map(function (r) { return r.y; }));
		S.from = minY;
		S.to = maxY;
		var seen = {};
		rows.forEach(function (r) { seen[r.state] = 1; });
		stateNames = Object.keys(seen).sort();

		var latest = d.slice().sort(function (a, b) { return dateVal(b) - dateVal(a); })[0];
		$('dashSub').textContent = plural(rows.length, 'PPC') + ' across ' + plural(stateNames.length, 'state/UT') + ' · latest release ' + latest.dateText;
		$('footNote').textContent = (rows.length - d.length) + ' PPCs without a recorded date of introduction are not plotted. Data: ' +
			(res.live ? 'read live from the PPC List.' : 'snapshot of the PPC List (regenerate with data/build-ppc-data.py).');

		renderKpis();
		setupControls();
		refresh();
	});
})();
