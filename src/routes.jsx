import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Contact from './pages/Contact.jsx';
import Address from './pages/Address.jsx';
import StampMaps from './pages/StampMaps.jsx';
import Copyright from './pages/Copyright.jsx';
import SpecialHome from './pages/SpecialHome.jsx';
import HowToCollect from './pages/HowToCollect.jsx';
import NotFound from './pages/NotFound.jsx';

// Every article is a data file (src/data/blog/<state>/<article>.json); each one gets its own page at the same
// address as before (/blog/<state>/<article>.html).
const articles = import.meta.glob('./data/blog/*/*.json');
const articleRoutes = Object.entries(articles).map(([file, load]) => {
  const [, state, slug] = /\/blog\/([^/]+)\/([^/]+)\.json$/.exec(file);
  return {
    path: `blog/${state}/${slug}.html`,
    lazy: async () => ({ Component: (await import('./pages/BlogPage.jsx')).default }),
    loader: async () => (await load()).default,
  };
});

const page = (loader) => ({ lazy: async () => ({ Component: (await loader()).default }) });
const special = (year) => ({
  lazy: async () => {
    const { default: SpecialCancellations } = await import('./pages/SpecialCancellations.jsx');
    return { Component: () => <SpecialCancellations year={year} /> };
  },
});

export const routes = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, Component: Home },
      { path: 'index.html', Component: Home },
      { path: 'list-pincode.html', ...page(() => import('./pages/ListPage.jsx')) },
      { path: 'dashboard.html', ...page(() => import('./pages/Dashboard.jsx')) },
      { path: 'po-map.html', ...page(() => import('./pages/PoMap.jsx')) },
      { path: 'blog/blog-main.html', ...page(() => import('./pages/KnowAbout.jsx')) },
      { path: 'stamp-maps.html', Component: StampMaps },
      { path: 'how-to-collect.html', Component: HowToCollect },
      { path: 'address.html', Component: Address },
      { path: 'contact.html', Component: Contact },
      { path: 'copyright-notice.html', Component: Copyright },
      // Not linked from the menus, but the pages stay reachable at their old addresses.
      { path: 'special-cancellations.html', Component: SpecialHome },
      { path: 'special-cancellations-2023.html', ...special(2023) },
      { path: 'special-cancellations-2024.html', ...special(2024) },
      { path: 'special-cancellations-2025.html', ...special(2025) },
      ...articleRoutes,
      { path: '404.html', Component: NotFound },
      { path: '*', Component: NotFound },
    ],
  },
];
