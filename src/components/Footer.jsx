import { Link } from 'react-router-dom';
import { Icons } from './Icons.jsx';
import { FOOTER_COLLECT, FOOTER_EXPLORE } from './nav.js';

export default function Footer() {
  return (
    <footer className="ppc-footer">
      <div className="ppc-footer__inner">
        <div className="ppc-footer__rule"></div>
        <div className="ppc-footer__grid">
          <div>
            <Link className="ppc-footer__brand" to="/">
              <img src="/data/logo.png" alt="" width="52" height="52" decoding="async" />
              <span>
                Permanent Pictorial
                <br />
                Cancellations of India
              </span>
            </Link>
            <p className="ppc-footer__blurb">
              A philatelic record of the permanent pictorial cancellations of India Post — documenting the monuments, wildlife and heritage stamped across the
              country's post offices.
            </p>
          </div>
          <nav aria-label="Explore">
            <h2>Explore</h2>
            <ul>
              {FOOTER_EXPLORE.map((i) => (
                <li key={i.to}>
                  <Link to={i.to}>{i.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Collecting">
            <h2>Collecting</h2>
            <ul>
              {FOOTER_COLLECT.map((i) => (
                <li key={i.to}>
                  <Link to={i.to}>{i.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Connect" className="ppc-footer__contact">
            <h2>Connect</h2>
            <ul>
              <li>
                <Link to="/contact.html">
                  <Icons.mail />
                  Contact
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="ppc-footer__bar">
          <p>
            &copy; 2023–<span suppressHydrationWarning>{new Date().getFullYear()}</span> PPCs of India by Chunduru Praneeth Sai. All rights reserved.
          </p>
          <p>
            <Link to="/copyright-notice.html">Copyright Notice</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
