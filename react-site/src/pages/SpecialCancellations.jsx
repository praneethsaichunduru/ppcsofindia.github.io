import { useMemo, useState } from 'react';
import Page from '../components/Page.jsx';
import y2023 from '../data/special/2023.json';
import y2024 from '../data/special/2024.json';
import y2025 from '../data/special/2025.json';
import '../styles/pages/special.css';

const YEARS = { 2023: y2023, 2024: y2024, 2025: y2025 };

/* A year's table of special cancellations, with a search box and a filter by circle (state). */
export default function SpecialCancellations({ year }) {
  const data = YEARS[year];
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState(new Set());
  const rows = useMemo(() => data.rows.map((r) => ({ ...r, text: r.cells.slice(1).join('\n').toLowerCase() })), [data]);
  const q = query.toLowerCase();
  const filtering = !!q || picked.size > 0;
  const shown = rows.filter((r) => (!q || r.text.includes(q)) && (picked.size === 0 || picked.has(r.cells[5])));
  const toggle = (s) => {
    const next = new Set(picked);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    setPicked(next);
  };
  return (
    <Page title={data.docTitle} kind="main" scope="special" heading={<h1>{data.title}</h1>}>
      <section className="search-container">
        <div className="input-group mb-3">
          <input type="text" id="searchInput" className="form-control" placeholder="Search here..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="input-group-append">
            <button className="btn btn-outline-secondary" type="button" onClick={() => setQuery('')}>
              x
            </button>
          </div>
        </div>
      </section>
      <section className="filter-container">
        {data.states.map((s) => (
          <label key={s} className={s.replace(/\s+/g, '-')}>
            <input type="checkbox" value={s} checked={picked.has(s)} onChange={() => toggle(s)} /> <span>{s}</span>
          </label>
        ))}
        <button className="btn btn-outline-secondary ml-2" onClick={() => setPicked(new Set())}>
          Deselect All
        </button>
      </section>
      <section className="count-container" id="countContainer">
        {q ? 'Matching Rows: ' + shown.length : picked.size > 0 ? 'No. of Special Cancellations: ' + shown.length : ''}
      </section>
      <section className="table-container ppc-table-wide">
        <table id="ppcTable" className="table table-striped ppc-cards">
          <thead>
            <tr>
              {data.heads.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown
              .map((r, i) => (
                <tr key={i} className={`${r.cls} data-row`}>
                  {r.cells.map((c, k) => (
                    <td key={k} data-label={data.heads[k].trim()}>
                      {c}
                    </td>
                  ))}
                  <td data-label={data.heads[data.heads.length - 1].trim()}>
                    <a href={'/' + r.img}>
                      <img src={'/' + r.img} alt={r.alt} width="150" height="100" loading="lazy" decoding="async" />
                    </a>
                  </td>
                </tr>
              ))
              .flatMap((tr, i) =>
                !filtering && shown[i].sep
                  ? [
                      tr,
                      <tr key={'sep' + i} className="exclude-hover line-partition">
                        <td colSpan={7}>
                          <hr />
                        </td>
                      </tr>,
                    ]
                  : [tr],
              )}
          </tbody>
        </table>
      </section>
    </Page>
  );
}
