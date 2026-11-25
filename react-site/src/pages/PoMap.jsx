import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Page from '../components/Page.jsx';
import MAP from '../data/indiaMap.json';
import POINTS from '../data/poPins.json';
import '../styles/pages/pomap.css';

/* PO Map: an outline of India with a pin for every post office that has a PPC. Each pin's position comes from the
   post office's DIGIPIN (India Post's 10-character location code); clicking a pin opens Google Maps with directions
   to it (with no starting point in the link, Google uses the visitor's current location).

   DIGIPIN: each of the 10 characters picks a cell of a 4x4 grid laid over 2.5-38.5 N, 63.5-99.5 E, every level
   subdividing the previous cell. */

const GRID = ['FC98', 'J327', 'K456', 'LMPT'];
const W = MAP.viewBox[2];
const H = MAP.viewBox[3];
const PIN_PATH = 'M0 0C-4 -7 -8 -10 -8 -15A8 8 0 1 1 8 -15C8 -10 4 -7 0 0Z';
const DRAW_ORDER = [3, 4, 2, 1]; // the most important pins are drawn last, so they sit on top
const CATS = {
  1: { label: 'GPO / HO / PB', note: 'General and head post offices, philatelic bureaus' },
  2: { label: 'Sub post office', note: 'SO' },
  3: { label: 'Branch post office', note: 'BO' },
  4: { label: 'MDG / not known', note: 'Mukhya Dak Ghar, or rank not known' },
};
const CAT1 = { 'GPO-PB': 1, GPO: 1, PB: 1, 'HO-PB': 1, HO: 1 };

/** DIGIPIN -> { lat, lon } (centre of the final cell), or null if malformed. */
function decode(code) {
  const c = String(code).replace(/-/g, '').toUpperCase();
  if (c.length !== 10) return null;
  let minLat = 2.5;
  let maxLat = 38.5;
  let minLon = 63.5;
  let maxLon = 99.5;
  for (let i = 0; i < 10; i++) {
    let r = -1;
    let col = -1;
    for (let k = 0; k < 4; k++) {
      const at = GRID[k].indexOf(c[i]);
      if (at >= 0) {
        r = k;
        col = at;
        break;
      }
    }
    if (r < 0) return null;
    const latDiv = (maxLat - minLat) / 4;
    const lonDiv = (maxLon - minLon) / 4;
    maxLat -= latDiv * r;
    minLat = maxLat - latDiv;
    minLon += lonDiv * col;
    maxLon = minLon + lonDiv;
  }
  return { lat: (minLat + maxLat) / 2, lon: (minLon + maxLon) / 2 };
}

const project = (p) => ({ x: (p.lon - MAP.lon0) * MAP.cos * MAP.scale, y: (MAP.lat1 - p.lat) * MAP.scale });
const directionsUrl = (p) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;
const categoryOf = (rank) => (CAT1[rank] ? 1 : rank === 'SO' ? 2 : rank === 'BO' ? 3 : 4);

let skipped = 0;
const PINS = POINTS.pins
  .map((r, idx) => {
    const p = decode(r.digipin);
    if (!p) {
      skipped++;
      return null;
    }
    const xy = project(p);
    const rank = String(
      r.rank ||
        String(r.po || '')
          .trim()
          .split(/\s+/)
          .pop(),
    ).toUpperCase();
    return {
      ...r,
      idx,
      rank,
      cat: categoryOf(rank),
      lat: p.lat,
      lon: p.lon,
      x: xy.x,
      y: xy.y,
      url: directionsUrl(p),
      text: [r.po, rank, r.pincode, r.ppc, r.digipin].join(' ').toLowerCase(),
    };
  })
  .filter(Boolean);
const DRAWN = PINS.slice().sort((a, b) => DRAW_ORDER.indexOf(a.cat) - DRAW_ORDER.indexOf(b.cat));

/* The map itself never re-renders: panning and zooming change its viewBox and the pins' size directly. */
function MapSvg({ svgRef, pinRefs, dim, onTip }) {
  return (
    <svg id="map" ref={svgRef} role="img" aria-label="Map of India with post offices that have a PPC" viewBox={`0 0 ${W} ${H}`}>
      <g>
        {MAP.states.map((s) => (
          <path key={s.name} d={s.d} className="state" data-name={s.name} onPointerMove={(e) => onTip(e, <b>{s.name}</b>)} onPointerLeave={() => onTip(null)} />
        ))}
      </g>
      <g>
        {DRAWN.map((p) => (
          <a
            key={p.idx}
            ref={(el) => {
              if (el) pinRefs.current[p.idx] = el;
              else delete pinRefs.current[p.idx];
            }}
            className={`pin c${p.cat}${dim(p) ? ' dim' : ''}`}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${p.po}, ${p.pincode}. Open directions in Google Maps`}
            transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(2.3)`}
            onPointerMove={(e) => onTip(e, <PinTip p={p} />)}
            onPointerLeave={() => onTip(null)}
            onFocus={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              onTip({ clientX: r.left + r.width / 2, clientY: r.top }, <PinTip p={p} />);
            }}
            onBlur={() => onTip(null)}
          >
            <path d={PIN_PATH} />
            <circle cx="0" cy="-15" r="3" className="pin-dot" />
          </a>
        ))}
      </g>
    </svg>
  );
}

const PinTip = ({ p }) => (
  <>
    <b>{p.po}</b>
    <div>
      <span className={`chip c${p.cat}`}></span>
      {p.rank} · {CATS[p.cat].label}
    </div>
    <div>Pincode {p.pincode}</div>
    <div>{p.ppc}</div>
    <div className="mono">{p.digipin}</div>
    <div className="hint">Click for directions in Google Maps</div>
  </>
);

export default function PoMap() {
  const svg = useRef(null);
  const wrap = useRef(null);
  const tipRef = useRef(null);
  const pinNodes = useRef({});
  const view = useRef({ x: 0, y: 0, w: W, h: H });
  const pinW = useRef(0);
  const anim = useRef(null);
  const frame = useRef(0);
  const animFrame = useRef(0);
  const pointers = useRef({});
  const moved = useRef(false);
  const [query, setQuery] = useState('');
  const [hidden, setHidden] = useState({});
  const [tip, setTip] = useState(null); // { x, y, body }
  const [flash, setFlash] = useState(-1);

  const q = query.trim().toLowerCase();
  const matches = (p) => (!q || p.text.indexOf(q) >= 0) && !hidden[p.cat];
  const dim = (p) => !matches(p);
  const shown = PINS.filter(matches);

  // ---- the view (viewBox and pin size), changed directly for smooth movement ----------------
  const unit = () => view.current.w / (svg.current ? svg.current.clientWidth || W : W); // map units per screen pixel
  const placePins = useCallback(() => {
    const s = (unit() * 0.9).toFixed(4);
    PINS.forEach((p) => {
      const node = pinNodes.current[p.idx];
      if (node) node.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${s})`);
    });
    if (svg.current) svg.current.style.touchAction = view.current.w < W * 0.98 ? 'none' : 'pan-y';
  }, []);
  const apply = useCallback(() => {
    const v = view.current;
    const m = W * 0.05;
    v.x = Math.max(-m, Math.min(W + m - v.w, v.x));
    v.y = Math.max(-m, Math.min(H + m - v.h, v.y));
    if (svg.current) svg.current.setAttribute('viewBox', `${v.x.toFixed(1)} ${v.y.toFixed(1)} ${v.w.toFixed(1)} ${v.h.toFixed(1)}`);
    if (v.w !== pinW.current) {
      pinW.current = v.w;
      placePins();
    }
  }, [placePins]);
  const schedule = useCallback(() => {
    // pans: at most one redraw per frame
    if (!frame.current) {
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        apply();
      });
    }
  }, [apply]);
  const step = useCallback(() => {
    animFrame.current = 0;
    const t = anim.current;
    if (!t) return;
    const v = view.current;
    const k = 0.25;
    v.x += (t.x - v.x) * k;
    v.y += (t.y - v.y) * k;
    v.w += (t.w - v.w) * k;
    v.h = (v.w * H) / W;
    if (Math.abs(t.w - v.w) < 0.5 && Math.abs(t.x - v.x) < 0.3 && Math.abs(t.y - v.y) < 0.3) {
      view.current = { x: t.x, y: t.y, w: t.w, h: t.h };
      anim.current = null;
    }
    apply();
    if (anim.current) animFrame.current = requestAnimationFrame(step);
  }, [apply]);
  const animateTo = useCallback(
    (t) => {
      anim.current = { ...t, h: (t.w * H) / W };
      if (!animFrame.current) animFrame.current = requestAnimationFrame(step);
    },
    [step],
  );
  const zoomAt = useCallback(
    (factor, cx, cy, instant) => {
      const b = (!instant && anim.current) || view.current;
      const w = Math.max(W / 14, Math.min(W, b.w / factor));
      const k = w / b.w;
      const t = { x: cx - (cx - b.x) * k, y: cy - (cy - b.y) * k, w };
      if (instant) {
        anim.current = null;
        view.current = { ...t, h: (w * H) / W };
        apply();
      } else animateTo(t);
    },
    [animateTo, apply],
  );
  const toMap = (clientX, clientY) => {
    const r = svg.current.getBoundingClientRect();
    const v = view.current;
    return { x: v.x + ((clientX - r.left) / r.width) * v.w, y: v.y + ((clientY - r.top) / r.height) * v.h };
  };
  const zoomCentre = (f) => {
    const b = anim.current || view.current;
    zoomAt(f, b.x + b.w / 2, b.y + b.h / 2);
  };

  // Drag to pan, pinch to zoom, Ctrl/Cmd + wheel to zoom, double-click to zoom in.
  useEffect(() => {
    const el = svg.current;
    let drag = null;
    let lastDist = 0;
    const keys = () => Object.keys(pointers.current);
    const dist = () => {
      const [a, b] = keys().map((k) => pointers.current[k]);
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const down = (e) => {
      pointers.current[e.pointerId] = { x: e.clientX, y: e.clientY };
      moved.current = false;
      anim.current = null;
      drag = { x: e.clientX, y: e.clientY, vx: view.current.x, vy: view.current.y };
      if (keys().length === 2) lastDist = dist();
    };
    const move = (e) => {
      if (!pointers.current[e.pointerId]) return;
      pointers.current[e.pointerId] = { x: e.clientX, y: e.clientY };
      const n = keys().length;
      if (n === 2) {
        const [a, b] = keys().map((k) => pointers.current[k]);
        const d = dist();
        const c = toMap((a.x + b.x) / 2, (a.y + b.y) / 2);
        if (lastDist) zoomAt(d / lastDist, c.x, c.y, true);
        lastDist = d;
        moved.current = true;
      } else if (drag && n === 1 && view.current.w < W * 0.98) {
        const dx = e.clientX - drag.x;
        const dy = e.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) moved.current = true;
        if (moved.current) {
          const u = unit();
          view.current.x = drag.vx - dx * u;
          view.current.y = drag.vy - dy * u;
          el.classList.add('moving');
          schedule();
          setTip(null);
        }
      }
    };
    const up = (e) => {
      delete pointers.current[e.pointerId];
      lastDist = 0;
      drag = null;
      el.classList.remove('moving');
    };
    // A drag that ends on a pin must not count as a click on it.
    const click = (e) => {
      if (moved.current) {
        e.preventDefault();
        e.stopPropagation();
        moved.current = false;
      }
    };
    const wheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const c = toMap(e.clientX, e.clientY);
      zoomAt(e.deltaY < 0 ? 1.25 : 0.8, c.x, c.y);
    };
    const dbl = (e) => {
      const c = toMap(e.clientX, e.clientY);
      zoomAt(1.8, c.x, c.y);
    };
    const resize = () => {
      pinW.current = 0;
      apply();
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    el.addEventListener('click', click, true);
    el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('dblclick', dbl);
    window.addEventListener('resize', resize);
    apply();
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      el.removeEventListener('click', click, true);
      el.removeEventListener('wheel', wheel);
      el.removeEventListener('dblclick', dbl);
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(frame.current);
      cancelAnimationFrame(animFrame.current);
    };
  }, [apply, schedule, zoomAt]);

  // ---- tooltip ------------------------------------------------------------------------------
  const onTip = useCallback((e, body) => {
    if (!e) return setTip(null);
    if (Object.keys(pointers.current).length) return undefined; // not while dragging
    const b = wrap.current.getBoundingClientRect();
    return setTip({ x: e.clientX - b.left, y: e.clientY - b.top, body });
  }, []);
  useLayoutEffect(() => {
    const t = tipRef.current;
    const w = wrap.current;
    if (!t || !w || !tip) return;
    let left = tip.x + 14;
    const top = tip.y + 14;
    if (left + t.offsetWidth > w.clientWidth) left = tip.x - t.offsetWidth - 14;
    t.style.left = Math.max(0, left) + 'px';
    t.style.top = Math.max(0, Math.min(top, w.clientHeight - t.offsetHeight)) + 'px';
  });

  const locate = (p) => {
    const w = W / 5;
    animateTo({ x: p.x - w / 2, y: p.y - (w * H) / W / 2, w });
    setFlash(p.idx);
    setTimeout(() => setFlash(-1), 1600);
    if (wrap.current) wrap.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  useEffect(() => {
    Object.keys(pinNodes.current).forEach((k) => pinNodes.current[k].classList.toggle('flash', Number(k) === flash));
  }, [flash]);

  const stable = useMemo(() => <MapSvg svgRef={svg} pinRefs={pinNodes} dim={dim} onTip={onTip} />, [query, hidden, onTip]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Page title="PO Map" kind="main" scope="pomap" heading={<h1>PO Map</h1>}>
      <p className="pomap-sub">Post offices that have a PPC. Click a pin to get directions from where you are, in Google Maps.</p>
      <div className="pomap">
        {POINTS.sample ? (
          <p className="notice" id="sampleNote">
            <b>Sample data.</b> The pins below are placeholders for testing, not the final list of post offices.
          </p>
        ) : null}
        <section className="panel" aria-label="Map">
          <div className="map-tools">
            <input
              type="search"
              id="poSearch"
              className="form-control"
              placeholder="Search post office, pincode, PPC or DIGIPIN…"
              aria-label="Search post offices"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="zoom" role="group" aria-label="Zoom">
              <button type="button" id="zoomOut" aria-label="Zoom out" onClick={() => zoomCentre(1 / 1.5)}>
                &minus;
              </button>
              <button type="button" id="zoomIn" aria-label="Zoom in" onClick={() => zoomCentre(1.5)}>
                +
              </button>
              <button type="button" id="zoomReset" className="txt" onClick={() => animateTo({ x: 0, y: 0, w: W })}>
                Reset
              </button>
            </div>
          </div>
          <div className="legend" id="legend" aria-label="Pin colours (click to hide or show a category)">
            {[1, 2, 3, 4].map((c) => (
              <button
                key={c}
                type="button"
                className="legend-item"
                aria-pressed={!hidden[c]}
                title={CATS[c].note + ' — click to hide or show'}
                onClick={() => setHidden((h) => ({ ...h, [c]: !h[c] }))}
              >
                <span className={`chip c${c}`}></span>
                {CATS[c].label} <small>({PINS.filter((p) => p.cat === c).length})</small>
              </button>
            ))}
          </div>
          <div id="mapWrap" ref={wrap}>
            {stable}
            {tip ? (
              <div className="tip" id="mapTip" ref={tipRef}>
                {tip.body}
              </div>
            ) : null}
          </div>
          <p className="map-hint">Drag to move, double-click or use +/− to zoom (Ctrl + scroll also works). Pins open Google Maps in a new tab.</p>
        </section>

        <section className="panel" aria-label="Post office list">
          <div className="list-head">
            <h2>Post offices</h2>
            <span id="poCount">{shown.length === PINS.length ? PINS.length + ' post offices' : shown.length + ' of ' + PINS.length + ' post offices'}</span>
          </div>
          <div className="po-table-wrap">
            <table className="po-table">
              <thead>
                <tr>
                  <th>Post office</th>
                  <th>Rank</th>
                  <th>Pincode</th>
                  <th>PPC</th>
                  <th>DIGIPIN</th>
                  <th></th>
                </tr>
              </thead>
              <tbody id="poRows">
                {PINS.map((p) => (
                  <tr key={p.idx} hidden={dim(p)}>
                    <td>{p.po}</td>
                    <td>
                      <span className={`chip c${p.cat}`}></span>
                      {p.rank}
                    </td>
                    <td>{p.pincode}</td>
                    <td>{p.ppc}</td>
                    <td className="mono">{p.digipin}</td>
                    <td className="acts">
                      <button type="button" className="link-btn" onClick={() => locate(p)}>
                        Show on map
                      </button>{' '}
                      <a href={p.url} target="_blank" rel="noopener noreferrer">
                        Directions
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {skipped ? (
            <p className="foot-note" id="skipNote">
              {skipped} {skipped === 1 ? 'entry' : 'entries'} skipped: not a valid 10-character DIGIPIN.
            </p>
          ) : (
            <p className="foot-note" id="skipNote"></p>
          )}
        </section>
        <p className="foot-note">
          Outline: DataMeet state boundaries (CC BY 4.0) and curated J&amp;K / Ladakh district boundaries, simplified. Illustrative only, not an official map.
        </p>
      </div>
    </Page>
  );
}
