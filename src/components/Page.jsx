import { Head } from 'vite-react-ssg';
import ShareMenu from './ShareMenu.jsx';

/* The frame around a page's content.

   kind="container": the content sits in a ".container" (articles and plain text pages).
   kind="main":      the page has its own heading and layout; it gets a heading band and a centred column.

   "scope" is the page's own style scope: its stylesheet (src/styles/pages/<scope>.css) is applied
   only inside an element carrying the class "pg-<scope>". */
export default function Page({ title, kind = 'container', scope, heading, share = false, mainClass = '', children }) {
  const cls = ['ppc-main', mainClass, scope ? 'pg-' + scope : ''].filter(Boolean).join(' ');
  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      {kind === 'main' && heading ? (
        <header className={'ppc-page-header' + (scope ? ' pg-' + scope : '')}>
          <div className="ppc-container">{heading}</div>
        </header>
      ) : null}
      <main className={cls} id="main">
        {kind === 'main' ? <div className="ppc-container">{children}</div> : <div className="container">{children}</div>}
      </main>
      {share ? <ShareMenu /> : null}
    </>
  );
}
