import { Fragment } from 'react';
import { Link, useLoaderData, useNavigate } from 'react-router-dom';
import Page from '../components/Page.jsx';
import '../styles/pages/blog.css';

/* One article about a PPC. The content (titles, paragraphs, galleries, the date/address table) lives in
   src/data/blog/<state>/<article>.json; this page lays it out. */

/** Text and inline markup (bold, italics, links, line breaks) inside a paragraph or a table cell. */
function Inline({ parts }) {
  return (parts || []).map((p, i) => {
    if (typeof p === 'string') return <Fragment key={i}>{p}</Fragment>;
    const kids = p.c ? <Inline parts={p.c} /> : null;
    switch (p.t) {
      case 'br':
        return <br key={i} />;
      case 'a':
        return p.href.startsWith('/') ? (
          <Link key={i} to={p.href} className={p.cls}>
            {kids}
          </Link>
        ) : (
          <a key={i} href={p.href} target={p.target} rel={p.target === '_blank' ? 'noopener noreferrer' : undefined} className={p.cls}>
            {kids}
          </a>
        );
      default: {
        const Tag = p.t;
        return (
          <Tag key={i} className={p.cls}>
            {kids}
          </Tag>
        );
      }
    }
  });
}

function Block({ b, first }) {
  switch (b.t) {
    case 'h': {
      const Tag = 'h' + b.l;
      return <Tag>{b.text}</Tag>;
    }
    case 'p':
      return (
        <p className={b.cls}>
          <Inline parts={b.c} />
        </p>
      );
    case 'inline':
      return <Inline parts={b.c} />;
    case 'gallery':
      return (
        <div className="overview-images">
          {b.items.map((it, i) => (
            <div key={i}>
              <img src={it.src} alt={it.alt} className={it.cls} loading={first ? 'eager' : 'lazy'} decoding="async" />
              {it.credit ? <p className="credits">{it.credit}</p> : null}
            </div>
          ))}
        </div>
      );
    case 'table':
      return (
        <table className={b.cls}>
          <tbody>
            {b.rows.map((row, i) => (
              <tr key={i}>
                {row.map((c, k) => {
                  const Cell = c.h ? 'th' : 'td';
                  return (
                    <Cell key={k} rowSpan={c.rowSpan} colSpan={c.colSpan}>
                      <Inline parts={c.c} />
                    </Cell>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      );
    default:
      return null;
  }
}

export default function BlogPage() {
  const data = useLoaderData();
  const navigate = useNavigate();
  const firstGallery = data.body.findIndex((b) => b.t === 'gallery');
  return (
    <>
      <Page title={data.docTitle} scope="blog" share>
        <h1>{data.title}</h1>
        {data.regional ? <h1>{data.regional}</h1> : null}
        {data.body.map((b, i) => (
          <Block key={i} b={b} first={i === firstGallery} />
        ))}
      </Page>
      <button className="back-button" onClick={() => navigate('/blog/blog-main.html')}>
        &#8592; Back
      </button>
    </>
  );
}
