// One-time: pull the stylesheet that data/ppc-chrome.js injected at runtime out into a plain CSS file.
import fs from 'node:fs';
import vm from 'node:vm';
const src = fs.readFileSync(new URL('../../../data/ppc-chrome.js', import.meta.url), 'utf8');
let css = '';
const fakeEl = () =>
  new Proxy(
    {
      style: {},
      dataset: {},
      setAttribute() {},
      getAttribute() {
        return null;
      },
      appendChild() {},
      addEventListener() {},
      classList: {
        add() {},
        contains() {
          return false;
        },
      },
      set textContent(v) {
        css = v;
      },
    },
    {},
  );
const documentStub = {
  documentElement: { getAttribute: () => '', setAttribute() {}, removeAttribute() {}, style: { setProperty() {} } },
  getElementById: () => null,
  createElement: fakeEl,
  head: { appendChild() {} },
  body: { appendChild() {}, insertBefore() {}, firstChild: null, children: [] },
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener() {},
  readyState: 'complete',
  currentScript: null,
  getElementsByTagName: () => [],
};
const windowStub = {
  HTMLElement: function () {},
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  matchMedia: () => ({ matches: false }),
  addEventListener() {},
  location: { pathname: '/index.html' },
  HTMLElement: function () {},
  customElements: null,
  CustomEvent: function () {},
  MutationObserver: undefined,
};
documentStub.dispatchEvent = () => {};
vm.runInNewContext(
  src,
  {
    HTMLElement: function () {},
    CustomEvent: class {},
    document: documentStub,
    window: windowStub,
    Reflect,
    Object,
    String,
    Array,
    decodeURIComponent,
    URL,
    console,
  },
  { filename: 'ppc-chrome.js' },
);
fs.writeFileSync(new URL('../../src/styles/chrome.css', import.meta.url), css.replace(/\}(?=[^\n}])/g, '}\n'));
console.log('chrome css length', css.length);
