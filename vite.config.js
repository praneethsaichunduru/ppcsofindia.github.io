import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import fs from 'node:fs';
import path from 'node:path';

/* ---------------------------------------------------------------------------------------------
   Page styles are plain CSS files in src/styles/pages/<name>.css. Each one is scoped under
   ".pg-<name>" at build time, so two pages that both use a class such as ".panel" or ".tip" can
   never affect each other, however the visitor navigates between them.
   --------------------------------------------------------------------------------------------- */
function firstCompoundEnd(sel) {
  let depth = 0;
  for (let i = 0; i < sel.length; i++) {
    const ch = sel[i];
    if (ch === '[' || ch === '(') depth++;
    else if (ch === ']' || ch === ')') depth--;
    else if (depth === 0 && (ch === ' ' || ch === '>' || ch === '+' || ch === '~')) return i;
  }
  return sel.length;
}

function scopePageCss() {
  const rootRe = /^((?::root|html|body)(?:\[[^\]]*\]|:not\([^)]*\))*)(?:\s+(.*))?$/;
  return {
    postcssPlugin: 'scope-page-css',
    Once(root) {
      const file = (root.source && root.source.input && root.source.input.file) || '';
      const m = /[\\/]src[\\/]styles[\\/]pages[\\/]([\w-]+)\.css$/.exec(file);
      if (!m) return;
      const scope = '.pg-' + m[1];
      root.walkRules((rule) => {
        let p = rule.parent;
        while (p && p.type !== 'root') {
          if (p.type === 'atrule' && /keyframes$/i.test(p.name)) return;
          p = p.parent;
        }
        rule.selectors = rule.selectors.flatMap((sel) => {
          sel = sel.trim();
          const r = rootRe.exec(sel);
          if (r) {
            const head = r[1];
            const rest = r[2];
            if (/^(html|body)$/.test(head)) return [rest ? `${scope} ${rest}` : scope];
            if (head === ':root') return [rest ? `${scope} ${rest}` : scope];
            return [rest ? `${head} ${scope} ${rest}` : `${head} ${scope}`];
          }
          // inside the page's element, or on the page's element itself (the first compound selector)
          const end = firstCompoundEnd(sel);
          return [`${scope} ${sel}`, `${sel.slice(0, end)}${scope}${sel.slice(end)}`];
        });
      });
    },
  };
}
scopePageCss.postcss = true;

/* In development the old ".html" addresses are served by the app too. */
function htmlAddresses() {
  return {
    name: 'html-addresses',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = (req.url || '').split('?')[0];
        if (/\.html$/.test(url) && !fs.existsSync(path.join(server.config.root, url))) req.url = '/index.html';
        next();
      });
    },
  };
}

/* The pre-rendered page for the route "/blog/x.html" is written as "blog/x.html.html"; give it its proper name. */
function renameHtmlHtml(dir) {
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.html.html')) fs.renameSync(p, p.slice(0, -5));
    }
  };
  walk(dir);
}

// The pictures and a few files sit in this same folder; they are served (and copied into the
// build) at exactly the same addresses as before, so nothing has to be duplicated.
const repo = import.meta.dirname;
const copy = (src, dest) => ({ src: path.posix.join(repo.replace(/\\/g, '/'), src), dest });

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    htmlAddresses(),
    viteStaticCopy({
      targets: [
        copy('pictures', '.'),
        copy('blog/blog-related-pictures', 'blog'),
        copy('data/logo.png', 'data'),
        copy('data/home-page-icon.svg', 'data'),
        copy('data/book-image.jpg', 'data'),
        copy('Final Spl Cover Policy.pdf', '.'),
        copy('letter_template.pdf', '.'),
      ],
    }),
  ],
  css: { postcss: { plugins: [scopePageCss()] } },
  ssgOptions: {
    dirStyle: 'flat',
    script: 'defer',
    formatting: 'none',
    // "/index.html" is the same page as "/"; it only needs to work in the browser.
    includedRoutes: (paths) => paths.filter((p) => p !== '/index.html'),
    onFinished: (dir) => renameHtmlHtml(dir),
  },
  build: { chunkSizeWarningLimit: 900 },
});
