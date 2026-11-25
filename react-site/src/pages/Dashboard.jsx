import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Page from '../components/Page.jsx';
import ppcs from '../data/ppcs.json';
import '../styles/pages/dashboard.css';

/* The Dashboard: a histogram, line or scatter (bubble) chart of releases by year, broken down overall / by status /
   by state. Hovering (or tapping) a year shows that year's releases per state; a click opens the full details.
   The charts are plain SVG: no chart library, nothing leaves the page. */

const STATUSES = ['Working', 'Doubtful', 'Removed', 'Replaced'];
const PALETTE = ['#2563eb', '#e11d48', '#16a34a', '#f59e0b', '#7c3aed', '#0891b2', '#db2777', '#65a30d'];
const OTHER = '#94a3b8';
const ACCENT = 'var(--accent, #0b5cab)';
const stColor = (s) => `var(--st-${s})`;
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

const ROWS = ppcs.map((p) => {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(p.date);
  return { ...p, d: m ? +m[1] : 0, m: m ? +m[2] : 0, y: m ? +m[3] : null, dateText: p.date };
});
const DATED = ROWS.filter((r) => r.y !== null);
const dateVal = (r) => r.y * 10000 + r.m * 100 + r.d;
const MIN_Y = Math.min(...DATED.map((r) => r.y));
const MAX_Y = Math.max(...DATED.map((r) => r.y));
const STATE_NAMES = [...new Set(ROWS.map((r) => r.state))].sort();
const YEARS = [];
for (let y = MIN_Y; y <= MAX_Y; y++) YEARS.push(y);

const DEFAULTS = { chart: 'hist', group: 'overall', measure: 'year', statuses: new Set(STATUSES), states: new Set(), from: MIN_Y, to: MAX_Y, showAll: false };

function niceStep(raw) {
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  return [1, 2, 5, 10].map((k) => k * p).find((v) => v >= raw);
}

function filterRows(S, ignoreStates) {
  return DATED.filter((r) => S.statuses.has(r.status) && r.y >= S.from && r.y <= S.to && (ignoreStates || S.states.size === 0 || S.states.has(r.state)));
}

/** The numbers behind the chart. */
function build(S) {
  const rs = filterRows(S, false);
  const years = [];
  for (let y = S.from; y <= S.to; y++) years.push(y);
  const info = years.map(() => ({ n: 0, byState: {}, byStatus: {} }));
  rs.forEach((r) => {
    const f = info[r.y - S.from];
    f.n++;
    f.byState[r.state] = (f.byState[r.state] || 0) + 1;
    f.byStatus[r.status] = (f.byStatus[r.status] || 0) + 1;
  });

  const scatter = S.chart === 'scatter';
  const series = [];
  const add = (key, color, pred) => {
    const v = years.map(() => 0);
    let total = 0;
    rs.forEach((r) => {
      if (pred(r)) {
        v[r.y - S.from]++;
        total++;
      }
    });
    if (total) series.push({ key, color, v, total });
  };
  if (S.group === 'overall') add('All PPCs', ACCENT, () => true);
  else if (S.group === 'status') STATUSES.forEach((s) => add(s, stColor(s), (r) => r.status === s));
  else {
    const tally = {};
    rs.forEach((r) => (tally[r.state] = (tally[r.state] || 0) + 1));
    const ranked = Object.keys(tally).sort((a, b) => tally[b] - tally[a]);
    const keep = scatter || ranked.length <= 9 ? ranked : ranked.slice(0, 8);
    keep.forEach((st, i) => add(st, scatter ? ACCENT : PALETTE[i % PALETTE.length], (r) => r.state === st));
    if (keep.length < ranked.length) add('Other states', OTHER, (r) => !keep.includes(r.state));
  }

  const cum = S.measure === 'cum' && !scatter;
  let run = 0;
  const cumTotal = info.map((f) => (run += f.n));
  if (cum) {
    series.forEach((s) => {
      let acc = 0;
      s.v = s.v.map((n) => (acc += n));
    });
  }
  return { rs, years, info, series, cum, cumTotal };
}

function useWidth(ref, initial) {
  const [w, setW] = useState(initial);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setW(el.clientWidth || initial);
    if (!window.ResizeObserver) return undefined;
    const ro = new ResizeObserver(() => setW(el.clientWidth || initial));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, initial]);
  return w;
}

function TipBody({ model, S, i, j }) {
  const inf = model.info[i];
  const yr = model.years[i];
  const list = Object.keys(inf.byState).sort((a, b) => inf.byState[b] - inf.byState[a] || a.localeCompare(b));
  const s = j !== null ? model.series[j] : null;
  return (
    <>
      <div className="t-h">
        {yr}
        <span>
          {plural(inf.n, 'release')}
          {model.cum || S.measure === 'cum' ? ` · ${model.cumTotal[i]} to date` : ''}
        </span>
      </div>
      {!inf.n ? (
        <div className="t-title">No releases this year</div>
      ) : (
        <>
          {s ? (
            <>
              <div className="t-row t-focus">
                <span>
                  <i style={{ background: s.color }}></i> {s.key}
                </span>
                <b>{s.v[i]}</b>
              </div>
              <div className="t-row">
                <span>Share of {yr}’s releases</span>
                <b>{Math.round((s.v[i] / inf.n) * 100)}%</b>
              </div>
            </>
          ) : null}
          <div className="t-sec">
            <div className="t-title">By status</div>
            {STATUSES.filter((x) => inf.byStatus[x]).map((x) => (
              <div className="t-row" key={x}>
                <span>
                  <i style={{ background: stColor(x) }}></i> {x}
                </span>
                <b>{inf.byStatus[x]}</b>
              </div>
            ))}
          </div>
          <div className="t-sec">
            <div className="t-title">By state / UT</div>
            {list.slice(0, 8).map((st) => (
              <div className="t-row" key={st}>
                <span>{st}</span>
                <b>{inf.byState[st]}</b>
              </div>
            ))}
            {list.length > 8 ? <div className="t-title">+{list.length - 8} more</div> : null}
          </div>
          <div className="t-hint">{list.length > 8 ? 'Click for the full list' : 'Click for details'}</div>
        </>
      )}
    </>
  );
}

function Chart({ model, S, onOpen }) {
  const box = useRef(null);
  const tipRef = useRef(null);
  const width = useWidth(box, 900);
  const [hover, setHover] = useState(null); // { i, j, x, y }
  const tapped = useRef(-1);
  const scatter = S.chart === 'scatter';
  const nS = model.series.length;
  const n = model.years.length;

  const W = Math.max(width, 300);
  const rowH = S.group === 'state' ? 22 : 56;
  const H = scatter ? Math.max(220, 46 + nS * rowH) : W < 560 ? 300 : 400;
  const labelW = scatter ? (S.group === 'state' ? (W < 560 ? 96 : 150) : 78) : 46;
  const m = { l: labelW, r: 14, t: 12, b: 30 };
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;
  const band = pw / n;
  const xc = (i) => m.l + band * (i + 0.5);

  // Place the tooltip beside the pointer, flipping it when it would run off the chart.
  useLayoutEffect(() => {
    const tip = tipRef.current;
    const b = box.current;
    if (!tip || !b || !hover) return;
    let left = hover.x + 14;
    const top = hover.y + 14;
    if (left + tip.offsetWidth > b.clientWidth) left = hover.x - tip.offsetWidth - 14;
    tip.style.left = Math.max(0, left) + 'px';
    tip.style.top = Math.max(0, Math.min(top, b.clientHeight - tip.offsetHeight)) + 'px';
  });

  useEffect(() => {
    const away = (e) => {
      if (box.current && !box.current.contains(e.target)) setHover(null);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, []);

  if (!model.rs.length) {
    return (
      <div id="chart" ref={box}>
        <div className="chart-empty">No releases match the current filters.</div>
      </div>
    );
  }

  // scales
  let yOf = null;
  let ticks = [];
  let radius = null;
  let rowY = null;
  if (scatter) {
    const rh = ph / nS;
    let maxV = 1;
    model.series.forEach((s) => s.v.forEach((v) => v > maxV && (maxV = v)));
    const maxR = Math.min(band * 0.9, rh * 0.46, 16);
    radius = (v) => Math.max(2.5, Math.sqrt(v / maxV) * maxR);
    rowY = (j) => m.t + rh * (j + 0.5);
  } else {
    let maxVal = 1;
    if (S.chart === 'hist') {
      for (let i = 0; i < n; i++) {
        let sum = 0;
        model.series.forEach((s) => (sum += s.v[i]));
        if (sum > maxVal) maxVal = sum;
      }
    } else model.series.forEach((s) => s.v.forEach((v) => v > maxVal && (maxVal = v)));
    const step = niceStep(Math.max(1, maxVal / 5));
    const top = Math.ceil(maxVal / step) * step;
    yOf = (v) => m.t + ph - (v / top) * ph;
    for (let t = 0; t <= top; t += step) ticks.push(t);
  }
  const xs = niceStep(Math.max(1, 34 / band));
  const maxChars = Math.floor((labelW - 10) / 6.2);

  const locate = (e) => {
    const r = e.currentTarget.ownerSVGElement.getBoundingClientRect();
    const k = W / r.width;
    const px = (e.clientX - r.left) * k;
    const py = (e.clientY - r.top) * k;
    return {
      i: Math.max(0, Math.min(n - 1, Math.floor((px - m.l) / band))),
      j: scatter ? Math.max(0, Math.min(nS - 1, Math.floor((py - m.t) / (ph / nS)))) : null,
    };
  };
  const show = (e) => {
    const p = locate(e);
    const b = box.current.getBoundingClientRect();
    setHover({ ...p, x: e.clientX - b.left, y: e.clientY - b.top });
  };

  const hi = hover ? hover.i : null;
  const hj = hover ? hover.j : null;
  const ringV = scatter && hover ? model.series[hj].v[hi] : 0;

  return (
    <div id="chart" ref={box}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="PPC releases by year">
        {/* X axis: years */}
        {model.years.map((yr, i) =>
          yr % xs ? null : (
            <g key={yr}>
              <line x1={xc(i)} x2={xc(i)} y1={m.t} y2={m.t + ph} className="g-grid" />
              <text x={xc(i)} y={H - m.b + 17} textAnchor="middle" className="g-tick">
                {yr}
              </text>
            </g>
          ),
        )}
        {scatter
          ? model.series.map((s, j) => {
              const cy = rowY(j);
              const label = s.key.length > maxChars ? s.key.slice(0, maxChars - 1) + '…' : s.key;
              return (
                <g key={s.key}>
                  <line x1={m.l} x2={W - m.r} y1={cy} y2={cy} className="g-grid" />
                  <text x={m.l - 8} y={cy + 4} textAnchor="end" className="g-tick">
                    {label}
                  </text>
                  {s.v.map((v, i) =>
                    v ? <circle key={i} cx={xc(i)} cy={cy} r={radius(v)} style={{ fill: s.color, fillOpacity: 0.65, stroke: s.color }} /> : null,
                  )}
                </g>
              );
            })
          : null}
        {!scatter
          ? ticks.map((t) => (
              <g key={t}>
                <line x1={m.l} x2={W - m.r} y1={yOf(t)} y2={yOf(t)} className="g-grid" />
                <text x={m.l - 6} y={yOf(t) + 4} textAnchor="end" className="g-tick">
                  {t}
                </text>
              </g>
            ))
          : null}
        {!scatter && S.chart === 'hist'
          ? model.years.map((yr, k) => {
              const bw = Math.max(1, band * 0.78);
              let acc = 0;
              return (
                <g key={yr}>
                  {model.series.map((s) => {
                    const v = s.v[k];
                    if (!v) return null;
                    const rect = <rect key={s.key} x={xc(k) - bw / 2} y={yOf(acc + v)} width={bw} height={yOf(acc) - yOf(acc + v)} style={{ fill: s.color }} />;
                    acc += v;
                    return rect;
                  })}
                </g>
              );
            })
          : null}
        {!scatter && S.chart === 'line'
          ? model.series.map((s) => {
              const pts = s.v.map((v, i) => `${xc(i).toFixed(1)},${yOf(v).toFixed(1)}`);
              return (
                <g key={s.key}>
                  {S.group === 'overall' ? (
                    <polygon
                      points={`${xc(0).toFixed(1)},${yOf(0)} ${pts.join(' ')} ${xc(n - 1).toFixed(1)},${yOf(0)}`}
                      style={{ fill: s.color, fillOpacity: 0.12 }}
                    />
                  ) : null}
                  <polyline points={pts.join(' ')} style={{ fill: 'none', strokeWidth: 2, strokeLinejoin: 'round', stroke: s.color }} />
                  {band >= 7 ? s.v.map((v, i) => (v ? <circle key={i} cx={xc(i)} cy={yOf(v)} r="2.5" style={{ fill: s.color }} /> : null)) : null}
                </g>
              );
            })
          : null}
        <line x1={m.l} x2={W - m.r} y1={m.t + ph} y2={m.t + ph} className="g-axis" />
        <line x1={m.l} x2={m.l} y1={m.t} y2={m.t + ph} className="g-axis" />
        {/* hover: the highlighted year, the ring around the hovered bubble, the dots on the lines */}
        {hover ? <rect className="g-hover" x={m.l + band * hi} y={m.t} width={band} height={ph} /> : null}
        {hover && !scatter && S.chart === 'line'
          ? model.series.map((s) => (
              <circle key={s.key} cx={xc(hi)} cy={yOf(s.v[hi])} r="4.5" style={{ fill: s.color, stroke: 'var(--surface-card,#fff)', strokeWidth: 2 }} />
            ))
          : null}
        {hover && scatter && ringV ? (
          <circle
            cx={xc(hi)}
            cy={rowY(hj)}
            r={radius(ringV) + 2.5}
            fill="none"
            style={{ stroke: 'var(--text-strong,#0d1b2a)', strokeWidth: 2, pointerEvents: 'none' }}
          />
        ) : null}
        <rect
          x={m.l}
          y={m.t}
          width={pw}
          height={ph}
          fill="transparent"
          onPointerMove={show}
          onPointerDown={show}
          onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(null)}
          onClick={(e) => {
            const p = locate(e);
            // On touch the first tap only shows the tooltip; a second tap on the same year opens the details.
            if (e.pointerType === 'touch' && tapped.current !== p.i) {
              tapped.current = p.i;
              return;
            }
            tapped.current = -1;
            setHover(null);
            onOpen(p.i, p.j);
          }}
        />
      </svg>
      {hover ? (
        <div className="tip" ref={tipRef}>
          <TipBody model={model} S={S} i={hi} j={hj} />
        </div>
      ) : null}
    </div>
  );
}

function Detail({ model, S, open, onClose }) {
  const dlg = useRef(null);
  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (open && !d.open) {
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', '');
    }
    if (!open && d.open) d.close();
  }, [open]);

  let body = null;
  let title = '';
  if (open) {
    const { i, j } = open;
    const yr = model.years[i];
    const inf = model.info[i];
    title = `${yr} — ${plural(inf.n, 'release')}`;
    const states = Object.keys(inf.byState).sort((a, b) => inf.byState[b] - inf.byState[a] || a.localeCompare(b));
    const list = model.rs.filter((r) => r.y === yr).sort((a, b) => dateVal(a) - dateVal(b) || a.state.localeCompare(b.state));
    const stText = S.statuses.size === STATUSES.length ? 'all statuses' : Array.from(S.statuses).join(', ') || 'no status';
    const sts = S.states.size === 0 ? 'all states/UTs' : S.states.size <= 3 ? Array.from(S.states).join(', ') : S.states.size + ' states/UTs';
    const s = j !== null ? model.series[j] : null;
    body = (
      <>
        <p className="p-sub">
          {stText} · {sts}
        </p>
        {!inf.n ? (
          <p>No releases this year.</p>
        ) : (
          <>
            {s ? (
              <p className="dlg-focus">
                <i style={{ background: s.color }}></i> <b>{s.key}</b>: {plural(s.v[i], 'release')} ({Math.round((s.v[i] / inf.n) * 100)}% of {yr})
              </p>
            ) : null}
            <div className="dlg-chips">
              {STATUSES.filter((x) => inf.byStatus[x]).map((x) => (
                <span key={x}>
                  <i style={{ background: stColor(x) }}></i>
                  {x} <b>{inf.byStatus[x]}</b>
                </span>
              ))}
            </div>
            <h4>By state / UT ({states.length})</h4>
            <ul className="rank dlg-states">
              {states.map((st) => (
                <li key={st} style={{ cursor: 'default' }}>
                  <span>{st}</span>
                  <span className="bar">
                    <i style={{ width: (inf.byState[st] / inf.byState[states[0]]) * 100 + '%', background: 'var(--accent,#0b5cab)' }}></i>
                  </span>
                  <span className="num">{inf.byState[st]}</span>
                </li>
              ))}
            </ul>
            <h4>PPCs released in {yr}</h4>
            <ul className="recent">
              {list.map((r, k) => (
                <li key={k}>
                  <span className="dot" style={{ background: stColor(r.status) }} title={r.status}></span>
                  <span>
                    {r.name}
                    <br />
                    <span className="meta">
                      {r.state} · {r.district} · {r.pin}
                    </span>
                  </span>
                  <time>{r.dateText}</time>
                </li>
              ))}
            </ul>
          </>
        )}
      </>
    );
  }

  return (
    <dialog id="detail" ref={dlg} aria-labelledby="dlgTitle" onClose={onClose} onClick={(e) => e.target === dlg.current && onClose()}>
      <div className="dlg-head">
        <h3 id="dlgTitle">{title}</h3>
        <button type="button" id="dlgClose" aria-label="Close" onClick={onClose}>
          &times;
        </button>
      </div>
      <div id="dlgBody">{body}</div>
    </dialog>
  );
}

function Seg({ value, options, onPick, disabled }) {
  return (
    <div className="seg">
      {options.map(([v, label, title]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          disabled={disabled && disabled(v)}
          title={disabled && disabled(v) ? title : undefined}
          onClick={() => onPick(v)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [S, setS] = useState(DEFAULTS);
  const [open, setOpen] = useState(null); // { i, j } for the details pop-up
  const [showMore, setShowMore] = useState(false);
  const statePick = useRef(null);
  const set = (patch) => setS((s) => ({ ...s, ...patch }));

  // The state list closes on a click outside it.
  useEffect(() => {
    const onClick = (e) => {
      const d = statePick.current;
      if (d && d.open && !d.contains(e.target)) d.open = false;
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const model = useMemo(() => build(S), [S]);
  const scatter = S.chart === 'scatter';

  // headline figures (not affected by the filters)
  const kpis = useMemo(() => {
    const byYear = {};
    DATED.forEach((r) => (byYear[r.y] = (byYear[r.y] || 0) + 1));
    const peak = Object.keys(byYear).sort((a, b) => byYear[b] - byYear[a])[0];
    const latest = DATED.slice().sort((a, b) => dateVal(b) - dateVal(a))[0];
    const count = (s) => ROWS.filter((r) => r.status === s).length;
    return [
      ['Total PPCs', ROWS.length, DATED.length + ' with a release date', null],
      ['Working', count('Working'), 'in use today', stColor('Working')],
      ['Doubtful', count('Doubtful'), 'status unconfirmed', stColor('Doubtful')],
      ['Removed', count('Removed'), 'no longer in use', stColor('Removed')],
      ['Replaced', count('Replaced'), 'superseded by a new design', stColor('Replaced')],
      ['States / UTs', STATE_NAMES.length, 'with at least one PPC', null],
      ['Latest release', latest.dateText, latest.name, null],
      ['Peak year', peak, plural(byYear[peak], 'release'), null],
    ];
  }, []);
  const latestRow = useMemo(() => DATED.slice().sort((a, b) => dateVal(b) - dateVal(a))[0], []);

  const rank = useMemo(() => {
    const rs = filterRows(S, true);
    const by = {};
    rs.forEach((r) => {
      const o = by[r.state] || (by[r.state] = { total: 0, st: {} });
      o.total++;
      o.st[r.status] = (o.st[r.status] || 0) + 1;
    });
    const names = Object.keys(by).sort((a, b) => by[b].total - by[a].total || a.localeCompare(b));
    return { by, names };
  }, [S]);
  const shownRank = showMore ? rank.names : rank.names.slice(0, 10);
  const maxRank = rank.names.length ? rank.by[rank.names[0]].total : 1;
  const recent = useMemo(
    () =>
      filterRows(S, false)
        .sort((a, b) => dateVal(b) - dateVal(a))
        .slice(0, 8),
    [S],
  );
  const undated = ROWS.length - DATED.length;

  const toggleState = (st) => {
    const next = new Set(S.states);
    if (next.has(st)) next.delete(st);
    else next.add(st);
    set({ states: next });
  };

  const stStatus = S.statuses.size === STATUSES.length ? 'all statuses' : Array.from(S.statuses).join(', ') || 'no status';
  const stStates = S.states.size === 0 ? 'all states/UTs' : S.states.size <= 3 ? Array.from(S.states).join(', ') : S.states.size + ' states/UTs';
  const title = scatter
    ? 'Releases by year' + (S.group === 'overall' ? '' : ' and ' + (S.group === 'state' ? 'state/UT' : 'status'))
    : (model.cum ? 'Running total of PPCs' : 'PPCs released per year') + (S.group === 'overall' ? '' : ' by ' + (S.group === 'state' ? 'state/UT' : 'status'));

  return (
    <Page title="PPC Dashboard" kind="main" scope="dashboard" heading={<h1>PPC Dashboard</h1>}>
      <p className="dash-sub" id="dashSub">
        {plural(ROWS.length, 'PPC')} across {plural(STATE_NAMES.length, 'state/UT')} · latest release {latestRow.dateText}
      </p>
      <div className="dash">
        <section className="kpis" id="kpis" aria-label="Headline figures">
          {kpis.map((t) => (
            <div className="kpi" key={t[0]} style={t[3] ? { '--kpi': t[3] } : undefined}>
              <div className="k-label">{t[0]}</div>
              <div className="k-value">{t[1]}</div>
              <div className="k-sub">{t[2]}</div>
            </div>
          ))}
        </section>

        <section className="panel" aria-label="Chart options">
          <div className="controls">
            <div className="ctl">
              <span className="c-label">Chart</span>
              <Seg
                value={S.chart}
                options={[
                  ['hist', 'Histogram'],
                  ['line', 'Line'],
                  ['scatter', 'Scatter'],
                ]}
                onPick={(v) => set({ chart: v })}
              />
            </div>
            <div className="ctl">
              <span className="c-label">Break down by</span>
              <Seg
                value={S.group}
                options={[
                  ['overall', 'Overall'],
                  ['status', 'Status'],
                  ['state', 'State/UT'],
                ]}
                onPick={(v) => set({ group: v })}
              />
            </div>
            <div className="ctl">
              <span className="c-label">Measure</span>
              <Seg
                value={S.measure}
                options={[
                  ['year', 'Per year'],
                  ['cum', 'Running total', 'Not available for the scatter chart'],
                ]}
                disabled={(v) => v === 'cum' && scatter}
                onPick={(v) => set({ measure: v })}
              />
            </div>
            <div className="ctl">
              <span className="c-label">Status</span>
              <div className="checks" id="statusChecks">
                {STATUSES.map((s) => (
                  <label key={s} className={s}>
                    <input
                      type="checkbox"
                      value={s}
                      checked={S.statuses.has(s)}
                      onChange={(e) => {
                        const next = new Set(S.statuses);
                        if (e.target.checked) next.add(s);
                        else next.delete(s);
                        set({ statuses: next });
                      }}
                    />{' '}
                    {s}
                  </label>
                ))}
              </div>
            </div>
            <div className="ctl">
              <span className="c-label">States / UTs</span>
              <details className="statepick" id="statePick" ref={statePick}>
                <summary id="stateSummary">
                  {S.states.size === 0 ? 'All states' : S.states.size === 1 ? Array.from(S.states)[0] : S.states.size + ' states selected'}
                </summary>
                <div className="state-list" id="stateList">
                  <div className="sl-tools">
                    <button type="button" className="link-btn" onClick={() => set({ states: new Set() })}>
                      Clear selection
                    </button>
                  </div>
                  {STATE_NAMES.map((st) => (
                    <label key={st}>
                      <input type="checkbox" checked={S.states.has(st)} onChange={() => toggleState(st)} /> {st}
                    </label>
                  ))}
                </div>
              </details>
            </div>
            <div className="ctl">
              <span className="c-label">Years</span>
              <div className="years">
                <select
                  id="yearFrom"
                  aria-label="From year"
                  value={S.from}
                  onChange={(e) => {
                    const from = +e.target.value;
                    set({ from, to: Math.max(from, S.to) });
                  }}
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <span>to</span>
                <select
                  id="yearTo"
                  aria-label="To year"
                  value={S.to}
                  onChange={(e) => {
                    const to = +e.target.value;
                    set({ to, from: Math.min(S.from, to) });
                  }}
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="link-btn"
                  id="resetAll"
                  onClick={() => {
                    setS({ ...DEFAULTS, statuses: new Set(STATUSES), states: new Set() });
                    setShowMore(false);
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="panel" aria-label="Release chart">
          <div className="chart-head">
            <div>
              <h2 id="chartTitle">{title}</h2>
              <p className="p-sub" id="chartSub">
                {S.from}–{S.to} · {stStatus} · {stStates} · {plural(model.rs.length, 'PPC')}
              </p>
            </div>
            <div className="legend" id="legend">
              {scatter && S.group === 'state' ? (
                <span>Bubble size = releases in that year</span>
              ) : (
                <>
                  {model.series.map((s) => (
                    <span key={s.key}>
                      <i style={{ background: s.color }}></i>
                      {s.key} ({s.total})
                    </span>
                  ))}
                  {scatter ? <span>Bubble size = releases</span> : null}
                </>
              )}
            </div>
          </div>
          <Chart model={model} S={S} onOpen={(i, j) => setOpen({ i, j })} />
        </section>

        <div className="cols">
          <section className="panel" aria-label="Top states">
            <h2>Top states / UTs</h2>
            <p className="p-sub">Releases within the filters above. Click a state to focus the chart on it.</p>
            <ul className="rank" id="rank">
              {shownRank.map((st) => {
                const o = rank.by[st];
                return (
                  <li key={st} className={S.states.has(st) ? 'on' : ''} onClick={() => toggleState(st)}>
                    <span>{st}</span>
                    <span className="bar">
                      {STATUSES.filter((s) => o.st[s]).map((s) => (
                        <i key={s} style={{ width: (o.st[s] / maxRank) * 100 + '%', background: stColor(s) }} title={`${s}: ${o.st[s]}`}></i>
                      ))}
                    </span>
                    <span className="num">{o.total}</span>
                  </li>
                );
              })}
              {!shownRank.length ? <li style={{ cursor: 'default' }}>No releases match the current filters.</li> : null}
            </ul>
            {rank.names.length > 10 ? (
              <button type="button" className="link-btn" id="rankMore" style={{ marginTop: '0.5rem' }} onClick={() => setShowMore((m) => !m)}>
                {showMore ? 'Show top 10' : 'Show all ' + rank.names.length}
              </button>
            ) : null}
          </section>
          <section className="panel" aria-label="Latest releases">
            <h2>Latest releases</h2>
            <p className="p-sub">Most recent introductions within the filters above.</p>
            <ul className="recent" id="recent">
              {recent.map((r, k) => (
                <li key={k}>
                  <span className="dot" style={{ background: stColor(r.status) }} title={r.status}></span>
                  <span>
                    {r.name}
                    <br />
                    <span className="meta">
                      {r.state} · {r.district} · {r.pin}
                    </span>
                  </span>
                  <time>{r.dateText}</time>
                </li>
              ))}
              {!recent.length ? <li>No releases match the current filters.</li> : null}
            </ul>
          </section>
        </div>
        <p className="foot-note" id="footNote">
          {undated} PPCs without a recorded date of introduction are not plotted. Data comes from the PPC List.
        </p>

        <Detail model={model} S={S} open={open} onClose={useCallback(() => setOpen(null), [])} />
      </div>
    </Page>
  );
}
