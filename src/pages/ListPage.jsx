import { useEffect, useMemo, useRef, useState } from 'react';
import Page from '../components/Page.jsx';
import ppcs from '../data/ppcs.json';
import { picture } from '../lib/ppc.js';
import '../styles/pages/list.css';

/* The PPC List: search, status and state filters, a calendar for release dates, and sorting
   (by the Sort box or by clicking the Date / State headings). */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const STATUSES = ['Working', 'Doubtful', 'Removed', 'Replaced'];
const HEADINGS = ['S. No.', 'Name of PPC', 'Date of Introduction', 'Post Office and Rank', 'District', 'State', 'Pincode', 'Image'];

// "13.02.1995" -> 19950213; anything else (e.g. "Not Available") -> null
function dateNum(text) {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(text);
  return m ? Number(m[3]) * 10000 + Number(m[2]) * 100 + Number(m[1]) : null;
}
const dateKey = (y, m, d) => String(d).padStart(2, '0') + '.' + String(m + 1).padStart(2, '0') + '.' + y;

const ROWS = ppcs.map((r, idx) => ({
  ...r,
  idx,
  date: dateNum(r.date),
  pincode: Number(r.pin) || 0,
  // every cell except S. No. and Image, as the search always did
  text: [r.name, r.date, r.po, r.district, r.state, r.pin].join('\n').toLowerCase(),
}));

const DATE_COUNTS = {};
ROWS.forEach((r) => {
  const key = ppcs[r.idx].date;
  if (r.date !== null) DATE_COUNTS[key] = (DATE_COUNTS[key] || 0) + 1;
});
const DATE_KEYS = Object.keys(DATE_COUNTS).sort((a, b) => dateNum(a) - dateNum(b));
const YEARS = (() => {
  const nums = DATE_KEYS.map(dateNum);
  const min = Math.floor(Math.min(...nums) / 10000);
  const max = Math.floor(Math.max(...nums) / 10000);
  const out = [];
  for (let y = max; y >= min; y--) out.push(y);
  return out;
})();
const LATEST = dateNum(DATE_KEYS[DATE_KEYS.length - 1]);
const STATES = [...new Set(ppcs.map((r) => r.state))].sort((a, b) => a.localeCompare(b));

// Date of introduction then <pincode, state>; or State/UT then pincode then date. Undated rows go last in the date sorts.
function compareRows(mode, a, b) {
  if (mode === 'newest' || mode === 'oldest') {
    if (a.date !== b.date) {
      if (a.date === null) return 1;
      if (b.date === null) return -1;
      return (a.date - b.date) * (mode === 'oldest' ? 1 : -1);
    }
    if (a.pincode !== b.pincode) return a.pincode - b.pincode;
    const s = a.state.localeCompare(b.state);
    if (s !== 0) return s;
  } else if (mode === 'state-az' || mode === 'state-za') {
    const s = a.state.localeCompare(b.state) * (mode === 'state-za' ? -1 : 1);
    if (s !== 0) return s;
    if (a.pincode !== b.pincode) return a.pincode - b.pincode;
    if (a.date !== b.date) {
      if (a.date === null) return 1;
      if (b.date === null) return -1;
      return a.date - b.date;
    }
  }
  return a.idx - b.idx;
}

/** The picture in a row. It loads when the row nears the screen; a note shows if the scan does not exist yet. */
function RowImage({ file, alt }) {
  const [missing, setMissing] = useState(false);
  const img = useRef(null);
  useEffect(() => {
    const i = img.current;
    if (i && i.complete && i.naturalWidth === 0) setMissing(true);
  }, []);
  if (missing) return <span>{alt}</span>;
  return (
    <a href={picture(file)}>
      <img ref={img} loading="lazy" decoding="async" src={picture(file)} alt={alt} width="150" height="100" onError={() => setMissing(true)} />
    </a>
  );
}

const Row = ({ r, serial }) => (
  <tr className={`${r.status} data-row`}>
    <td data-label={HEADINGS[0]}>{serial}</td>
    <td data-label={HEADINGS[1]}>{r.name}</td>
    <td data-label={HEADINGS[2]}>{ppcs[r.idx].date}</td>
    <td data-label={HEADINGS[3]}>{r.po}</td>
    <td data-label={HEADINGS[4]}>{r.district}</td>
    <td data-label={HEADINGS[5]}>{r.state}</td>
    <td data-label={HEADINGS[6]}>{r.pin}</td>
    <td data-label={HEADINGS[7]}>
      <RowImage file={r.img} alt={r.name} />
    </td>
  </tr>
);

function Calendar({ selected, setSelected, onClose }) {
  const [year, setYear] = useState(Math.floor(LATEST / 10000));
  const [month, setMonth] = useState(Math.floor((LATEST % 10000) / 100) - 1);
  const last = useRef(null);
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();

  const shiftMonth = (delta) => {
    const d = new Date(year, month + delta, 1);
    if (d.getFullYear() < YEARS[YEARS.length - 1] || d.getFullYear() > YEARS[0]) return;
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const toggle = (key, shift) => {
    const next = new Set(selected);
    if (shift && last.current) {
      // Shift-click selects every release date between the two clicks
      const a = dateNum(last.current);
      const b = dateNum(key);
      DATE_KEYS.forEach((k) => {
        const n = dateNum(k);
        if (n >= Math.min(a, b) && n <= Math.max(a, b)) next.add(k);
      });
    } else if (next.has(key)) next.delete(key);
    else next.add(key);
    last.current = key;
    setSelected(next);
  };

  const cells = [];
  for (let i = 0; i < first; i++) cells.push(<div key={'e' + i} />);
  for (let d = 1; d <= days; d++) {
    const key = dateKey(year, month, d);
    const count = DATE_COUNTS[key];
    if (!count) {
      cells.push(
        <button key={d} type="button" className="cal-day" disabled>
          <span className="n">{d}</span>
        </button>,
      );
      continue;
    }
    const on = selected.has(key);
    cells.push(
      <button
        key={d}
        type="button"
        className={'cal-day has-ppc' + (on ? ' selected' : '')}
        title={`${count} PPC${count > 1 ? 's' : ''} introduced`}
        aria-pressed={on}
        onClick={(e) => toggle(key, e.shiftKey)}
      >
        <span className="n">{d}</span>
        <span className="c">{count}</span>
      </button>,
    );
  }

  return (
    <div id="calPanel" className="cal-panel">
      <div className="cal-head">
        <button type="button" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
          &lsaquo;
        </button>
        <select id="calMonth" className="form-control" aria-label="Month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => (
            <option key={m} value={i}>
              {m}
            </option>
          ))}
        </select>
        <select id="calYear" className="form-control" aria-label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <button type="button" aria-label="Next month" onClick={() => shiftMonth(1)}>
          &rsaquo;
        </button>
      </div>
      <div id="calGrid" className="cal-grid">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="cal-dow">
            {d}
          </div>
        ))}
        {cells}
      </div>
      <div className="cal-foot">
        <button
          type="button"
          onClick={() => {
            last.current = null;
            setSelected(new Set());
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}

export default function ListPage() {
  const [query, setQuery] = useState('');
  const [statuses, setStatuses] = useState(new Set());
  const [state, setState] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [sort, setSort] = useState('original');
  const [calOpen, setCalOpen] = useState(false);
  const tool = useRef(null);

  // Close the calendar on a click outside it, and on Escape.
  useEffect(() => {
    const onClick = (e) => {
      if (tool.current && !tool.current.contains(e.target) && !e.target.closest('#calPanel')) setCalOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setCalOpen(false);
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const sorted = useMemo(() => ROWS.slice().sort((a, b) => compareRows(sort, a, b)), [sort]);
  const q = query.toLowerCase();
  const visible = useMemo(
    () =>
      sorted
        .map((r, i) => ({ r, serial: sort === 'original' ? r.idx + 1 : i + 1 }))
        .filter(
          ({ r }) =>
            (!q || r.text.includes(q)) &&
            (statuses.size === 0 || statuses.has(r.status)) &&
            (state === '' || r.state === state) &&
            (selected.size === 0 || selected.has(ppcs[r.idx].date)),
        ),
    [sorted, sort, q, statuses, state, selected],
  );

  let count = '';
  if (q) count = 'Matching Rows: ' + visible.length;
  else if (statuses.size > 0 || state !== '' || selected.size > 0) count = 'No. of PPCs: ' + visible.length;

  // Clicking a heading cycles ascending -> descending -> original order
  const headerSort = (col) => {
    if (col === 'date') setSort(sort === 'oldest' ? 'newest' : sort === 'newest' ? 'original' : 'oldest');
    else setSort(sort === 'state-az' ? 'state-za' : sort === 'state-za' ? 'original' : 'state-az');
  };
  const ariaSort = (col) => {
    if (col === 'date') return sort === 'oldest' ? 'ascending' : sort === 'newest' ? 'descending' : 'none';
    return sort === 'state-az' ? 'ascending' : sort === 'state-za' ? 'descending' : 'none';
  };
  const sortHead = (col, label, title) => (
    <th
      className="sortable"
      tabIndex={0}
      aria-sort={ariaSort(col)}
      title={title}
      onClick={() => headerSort(col)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          headerSort(col);
        }
      }}
    >
      {label}
    </th>
  );

  const toggleStatus = (s) => {
    const next = new Set(statuses);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    setStatuses(next);
  };
  const sortedDates = [...selected].sort((a, b) => dateNum(a) - dateNum(b));

  return (
    <Page title="List of PPCs" kind="main" scope="list" heading={<h1>List of Permanent Pictorial Cancellations</h1>}>
      <div className="query-row">
        <section className="search-container">
          <div className="input-group mb-3">
            <input
              type="text"
              id="searchInput"
              className="form-control"
              placeholder="Search for PPC details..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="input-group-append">
              <button className="btn btn-outline-secondary" type="button" aria-label="Clear search" onClick={() => setQuery('')}>
                x
              </button>
            </div>
          </div>
        </section>
        <select id="stateSelect" className="form-control" aria-label="Filter by state" value={state} onChange={(e) => setState(e.target.value)}>
          <option value="">All States</option>
          {STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <section className="filter-container">
        {STATUSES.map((s) => (
          <label key={s} className={s}>
            <input type="checkbox" value={s} checked={statuses.has(s)} onChange={() => toggleStatus(s)} /> <span>{s}</span>
          </label>
        ))}
        <button
          className="btn btn-outline-secondary ml-2"
          onClick={() => {
            setStatuses(new Set());
            setState('');
            setSelected(new Set());
          }}
        >
          Deselect All
        </button>
      </section>
      <section className="tools-container">
        <label className="sort-label">
          Sort by
          <select id="sortSelect" className="form-control" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="original">State &amp; Pincode (default)</option>
            <option value="newest">Date of introduction: newest first</option>
            <option value="oldest">Date of introduction: oldest first</option>
            <option value="state-az">State/UT: A to Z</option>
            <option value="state-za">State/UT: Z to A</option>
          </select>
        </label>
        <div id="dateTool" ref={tool}>
          <button
            type="button"
            id="dateToggle"
            className="btn btn-outline-secondary icon-btn"
            title="Pick release dates"
            aria-label="Pick release dates"
            aria-expanded={calOpen}
            aria-controls="calPanel"
            onClick={() => setCalOpen((o) => !o)}
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <span id="dateToggleCount" className="badge">
              {selected.size ? selected.size : ''}
            </span>
          </button>
        </div>
        {calOpen ? <Calendar selected={selected} setSelected={setSelected} onClose={() => setCalOpen(false)} /> : null}
      </section>
      <section id="dateChips" aria-label="Selected dates">
        {sortedDates.map((k) => (
          <span className="date-chip" key={k}>
            {k} ({DATE_COUNTS[k]}){' '}
            <button
              type="button"
              aria-label={'Remove ' + k}
              onClick={() => {
                const next = new Set(selected);
                next.delete(k);
                setSelected(next);
              }}
            >
              ×
            </button>
          </span>
        ))}
      </section>
      <section className="count-container" id="countContainer">
        {count}
      </section>
      <section className="table-container ppc-table-wide">
        <table id="ppcTable" className="table table-striped ppc-cards">
          <thead>
            <tr>
              <th>{HEADINGS[0]}</th>
              <th>{HEADINGS[1]}</th>
              {sortHead('date', HEADINGS[2], 'Sort by date of introduction')}
              <th>{HEADINGS[3]}</th>
              <th>{HEADINGS[4]}</th>
              {sortHead('state', HEADINGS[5], 'Sort by State/UT')}
              <th>{HEADINGS[6]}</th>
              <th>{HEADINGS[7]}</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(({ r, serial }) => (
              <Row key={r.idx} r={r} serial={serial} />
            ))}
          </tbody>
        </table>
      </section>
    </Page>
  );
}
