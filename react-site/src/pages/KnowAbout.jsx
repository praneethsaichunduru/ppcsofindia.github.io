import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Page from '../components/Page.jsx';
import states from '../data/blogIndex.json';
import { CATS, REGIONS, REGION_OF, catOf, fromFile, picture } from '../lib/ppc.js';
import '../styles/pages/know.css';

/* Know About PPCs: a state list on the left; cards, post-office-type filters, a seasonal filter and a search on
   the right. The address bar holds the view (#state=Karnataka&rank=1,2&seasonal=1&q=temple), so a view can be shared.
   The entries come from src/data/blogIndex.json; the post office and its type are read from each article's file name. */

const PAGE = 48;
const ALL_CATS = [1, 2, 3, 4];

const STATES = states.map((s) => ({
  name: s.name,
  region: REGION_OF[s.name] || 'Other',
  items: s.items.map((e) => {
    const f = fromFile(e.slug);
    return { ...e, ...f, href: `/blog/${e.code}/${e.slug}.html`, c: catOf(f.rank), sea: !!e.seasonal || /seasonal/i.test(e.slug) };
  }),
}));
const TOTAL = STATES.reduce((n, s) => n + s.items.length, 0);
const ALL = STATES.flatMap((s) =>
  s.items.map((e) => ({ e, s: s.name, text: [e.name, e.po, e.pin, s.name, e.rank, e.sea ? 'seasonal' : ''].join(' ').toLowerCase() })),
);

function readHash() {
  const raw = decodeURIComponent(window.location.hash.slice(1));
  const p = new URLSearchParams(raw);
  const st = p.get('state') || (raw && raw.indexOf('=') < 0 ? raw : ''); // "#Kerala" (the old section links) still works
  const found = st && STATES.find((s) => s.name.toLowerCase() === st.toLowerCase());
  const r = (p.get('rank') || '1,2,3,4')
    .split(',')
    .map(Number)
    .filter((n) => n >= 1 && n <= 4);
  return { state: found ? found.name : '', q: p.get('q') || '', cats: r.length ? r : ALL_CATS, sea: p.get('seasonal') === '1' };
}

function hashOf(view) {
  const p = new URLSearchParams();
  if (view.state) p.set('state', view.state);
  if (view.q.trim()) p.set('q', view.q.trim());
  if (view.cats.length < 4) p.set('rank', view.cats.join(','));
  if (view.sea) p.set('seasonal', '1');
  const h = p.toString();
  return h ? '#' + h : '';
}

/** One PPC card. The picture loads only when the card nears the screen; a note shows if the scan does not exist yet. */
function Card({ x, withState }) {
  const e = x.e;
  const [missing, setMissing] = useState(false);
  const img = useRef(null);
  // A picture that failed before this page became interactive never reported its error; check once.
  useEffect(() => {
    const i = img.current;
    if (i && i.complete && i.naturalWidth === 0) setMissing(true);
  }, []);
  return (
    <Link className={`kcard c${e.c}`} to={e.href}>
      <span className={'thumb' + (missing ? ' noimg' : '')}>
        {e.sea ? (
          <span className="sea-flag" title="Seasonal post office: open only for part of the year">
            &#9733; Seasonal
          </span>
        ) : null}
        {!missing ? <img ref={img} loading="lazy" decoding="async" src={picture(e.img)} alt={e.name} onError={() => setMissing(true)} /> : null}
      </span>
      <span className="body">
        <b>{e.name}</b>
        <small>
          {e.po}
          {e.pin ? ` · ${e.pin}` : ''}
        </small>
        <span className="meta">
          <span className="badge">{e.rank || 'Other'}</span>
          <span className="st-name">{withState ? x.s : ''}</span>
        </span>
      </span>
    </Link>
  );
}

export default function KnowAbout() {
  const [view, setView] = useState({ state: '', q: '', cats: ALL_CATS, sea: false });
  const [shown, setShown] = useState(PAGE);
  const [ready, setReady] = useState(false);
  const [link, setLink] = useState('');
  const head = useRef(null);
  const moved = useRef(false);

  // The address bar -> the view (on arrival, and when the address changes under us).
  useEffect(() => {
    const apply = () => {
      setView(readHash());
      setShown(PAGE);
    };
    apply();
    setReady(true);
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, []);

  // The view -> the address bar.
  useEffect(() => {
    if (!ready) return;
    const h = hashOf(view);
    if (window.location.hash !== h) window.history.replaceState(null, '', h || window.location.pathname + window.location.search);
    setLink(window.location.href);
  }, [view, ready]);

  const update = useCallback((patch, userMoved) => {
    setView((v) => ({ ...v, ...patch }));
    setShown(PAGE);
    if (userMoved) moved.current = true;
  }, []);

  useEffect(() => {
    if (moved.current && head.current) {
      moved.current = false;
      head.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [view.state]);

  const pool = useMemo(() => ALL.filter((x) => !view.state || x.s === view.state), [view.state]);
  const q = view.q.trim().toLowerCase();
  const list = useMemo(
    () => pool.filter((x) => view.cats.includes(x.e.c) && (!view.sea || x.e.sea) && (!q || x.text.indexOf(q) >= 0)),
    [pool, view.cats, view.sea, q],
  );
  const nSea = pool.filter((x) => x.e.sea).length;
  const toggleCat = (c) => {
    const next = view.cats.includes(c) ? view.cats.filter((n) => n !== c) : [...view.cats, c];
    update({ cats: next.length ? next : ALL_CATS });
  };

  return (
    <>
      <Link to="/" className="home-icon" aria-label="Go to Home" title="Home">
        <img src="/data/home-page-icon.svg" alt="Go to Home" width="30" height="30" />
      </Link>
      <Page title="Know About PPCs" kind="main" scope="know" mainClass="kap">
        <h1>Know About Permanent Pictorial Cancellations</h1>
        <p className="lead">Choose a state, narrow it by post-office type or a word, and share the link.</p>
        <select
          id="pick"
          className="kp-select phone-pick"
          aria-label="State or UT"
          value={view.state}
          onChange={(e) => update({ state: e.target.value }, true)}
        >
          <option value="">All states and UTs ({TOTAL})</option>
          {STATES.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name} ({s.items.length})
            </option>
          ))}
        </select>
        <div className="layout">
          <nav className="side" aria-label="States and UTs">
            <button className="st" type="button" aria-current={String(view.state === '')} onClick={() => update({ state: '' }, true)}>
              <span>All states and UTs</span>
              <small>{TOTAL}</small>
            </button>
            {REGIONS.concat(['Other']).map((r) => {
              const sts = STATES.filter((s) => s.region === r);
              if (!sts.length) return null;
              return (
                <div key={r}>
                  <h3>{r}</h3>
                  {sts.map((s) => (
                    <button
                      key={s.name}
                      className={'st' + (s.items.length ? '' : ' off')}
                      type="button"
                      aria-current={String(view.state === s.name)}
                      onClick={() => update({ state: s.name }, true)}
                    >
                      <span>{s.name}</span>
                      <small>{s.items.length}</small>
                    </button>
                  ))}
                </div>
              );
            })}
          </nav>
          <section>
            <div className="head" ref={head}>
              <h2>{view.state || 'All states and UTs'}</h2>
              <span className="sum" aria-live="polite">
                {list.length} of {pool.length} PPC articles
              </span>
            </div>
            <div className="filters">
              <input
                type="search"
                placeholder="Search within this selection…"
                aria-label="Search within this selection"
                value={view.q}
                onChange={(e) => update({ q: e.target.value })}
              />
              <span>
                {ALL_CATS.map((c) => {
                  const n = pool.filter((x) => x.e.c === c).length;
                  return (
                    <button
                      key={c}
                      type="button"
                      className={`chip-btn c${c}` + (n ? '' : ' off')}
                      aria-pressed={view.cats.includes(c)}
                      title={CATS[c].note}
                      onClick={() => toggleCat(c)}
                    >
                      <span className="dot"></span>
                      {CATS[c].label} <small>{n}</small>
                    </button>
                  );
                })}
                <span className="sea-sep"></span>
                <button
                  type="button"
                  className={'chip-btn sea' + (nSea ? '' : ' off')}
                  aria-pressed={view.sea}
                  title="Post offices that are open only for part of the year"
                  onClick={() => update({ sea: !view.sea })}
                >
                  <span className="star">&#9733;</span> Seasonal only <small>{nSea}</small>
                </button>
              </span>
            </div>
            <p className="key">
              <b>How to read this page:</b> the colour shows the type of post office. <span className="star-key">&#9733;</span> marks a <b>seasonal</b> post
              office, one that is open only for part of the year.
            </p>
            {view.sea ? (
              <p className="seasonal-note">
                <b>&#9733; Seasonal post offices</b> work only for part of the year, usually during a pilgrimage or tourist season, so a cancellation from them
                can be collected only then. Check that the post office is open before you plan a visit or send an article.
              </p>
            ) : null}
            <div className={'pgrid' + (view.state ? ' single' : '')}>
              {list.slice(0, shown).map((x) => (
                <Card key={x.e.href} x={x} withState={!view.state} />
              ))}
              {!list.length ? <p className="empty-note">{pool.length ? 'Nothing matches these filters.' : 'No article for this state or UT yet.'}</p> : null}
            </div>
            {list.length > shown ? (
              <div className="more">
                <button type="button" className="chip-btn" onClick={() => setShown((n) => n + PAGE)}>
                  Show more
                </button>
              </div>
            ) : null}
            <p className="share">
              Link to this view: <code>{link}</code>
            </p>
          </section>
        </div>
      </Page>
    </>
  );
}
