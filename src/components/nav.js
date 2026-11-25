// The site's main navigation. Special Cancellations pages are deliberately not listed.
export const NAV = [
  { label: 'Index', to: '/', file: 'index.html', icon: 'home' },
  { label: 'PPC List', to: '/list-pincode.html', file: 'list-pincode.html', icon: 'list' },
  { label: 'Dashboard', to: '/dashboard.html', file: 'dashboard.html', icon: 'chart' },
  { label: 'Know About PPCs', to: '/blog/blog-main.html', file: 'blog-main.html', icon: 'book' },
  { label: 'Stamp Maps', to: '/stamp-maps.html', file: 'stamp-maps.html', icon: 'map' },
  { label: 'PO Map', to: '/po-map.html', file: 'po-map.html', icon: 'pin' },
  { label: 'How to Collect?', to: '/how-to-collect.html', file: 'how-to-collect.html', icon: 'help' },
  { label: 'Address', to: '/address.html', file: 'address.html', icon: 'inbox' },
  { label: 'Contact', to: '/contact.html', file: 'contact.html', icon: 'phone' },
];

export const FOOTER_EXPLORE = NAV.filter((n) => ['Index', 'PPC List', 'Dashboard', 'Know About PPCs', 'Stamp Maps', 'PO Map'].includes(n.label));
export const FOOTER_COLLECT = [
  { label: 'How to Collect?', to: '/how-to-collect.html' },
  { label: 'Address', to: '/address.html' },
  { label: 'Copyright Notice', to: '/copyright-notice.html' },
];

/** File name of the current address, for marking the active menu item. */
export function currentFile(pathname) {
  const last = pathname.split('/').pop();
  return last === '' ? 'index.html' : decodeURIComponent(last);
}
