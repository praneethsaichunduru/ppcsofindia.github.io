// Creates the starting point for a new article about a PPC:
//   - src/data/blog/<state>/<slug>.json    the article (picture, a placeholder paragraph, the date/address table)
//   - src/data/blogIndex.json              its card on the Know About PPCs page (kept in pincode order)
//
// Example:
//   npm run new-article -- --state ka --slug 560099-example-so --title "Example Fort" --regional "ಉದಾಹರಣೆ" \
//       --image 560099-ExampleFort-ExampleSO.jpg --date "March 1, 2026" \
//       --role "Sub Postmaster," --po "Example SO," --place "Bengaluru (dt.), Karnataka - 560099."
//
// Add --seasonal for a post office that is open only part of the year. Then open the new .json file and write the
// paragraphs. The PPC itself also needs one line in src/data/ppcs.json (that is the PPC List and the Dashboard).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const data = path.join(here, '..', 'src', 'data');

const STATE_OF = {
  an: 'Andaman and Nicobar Islands',
  ap: 'Andhra Pradesh',
  as: 'Assam',
  br: 'Bihar',
  cg: 'Chhattisgarh',
  ch: 'Chandigarh',
  dd: 'Dadra and Nagar Haveli and Daman and Diu',
  dl: 'Delhi',
  ga: 'Goa',
  gj: 'Gujarat',
  hp: 'Himachal Pradesh',
  hr: 'Haryana',
  jh: 'Jharkhand',
  jk: 'Jammu and Kashmir',
  ka: 'Karnataka',
  kl: 'Kerala',
  la: 'Ladakh',
  mh: 'Maharashtra',
  ml: 'Meghalaya',
  mn: 'Manipur',
  mp: 'Madhya Pradesh',
  od: 'Odisha',
  pb: 'Punjab',
  py: 'Puducherry',
  rj: 'Rajasthan',
  sk: 'Sikkim',
  tg: 'Telangana',
  tn: 'Tamil Nadu',
  tr: 'Tripura',
  uk: 'Uttarakhand',
  up: 'Uttar Pradesh',
  wb: 'West Bengal',
};

const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) continue;
  const k = argv[i].slice(2);
  args[k] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
}

const need = ['state', 'slug', 'title', 'image', 'date', 'role', 'po', 'place'];
const missing = need.filter((k) => !args[k] || args[k] === true);
if (missing.length) {
  console.error('Missing: ' + missing.map((m) => '--' + m).join(' '));
  console.error('See the notes at the top of scripts/new-article.mjs.');
  process.exit(1);
}
const state = STATE_OF[args.state];
if (!state) {
  console.error('Unknown state code "' + args.state + '". Known: ' + Object.keys(STATE_OF).join(' '));
  process.exit(1);
}

const file = path.join(data, 'blog', args.state, args.slug + '.json');
if (fs.existsSync(file)) {
  console.error('Already exists: ' + file);
  process.exit(1);
}

const article = {
  docTitle: args.title,
  title: args.title,
  ...(args.regional ? { regional: args.regional } : {}),
  body: [
    { t: 'gallery', items: [{ src: '/pictures/ppcs/' + args.image, alt: 'PPC', cls: 'yellowcard' }] },
    { t: 'p', c: ['(Write the article here: one object like this for each paragraph.)'] },
    {
      t: 'table',
      cls: 'info-table',
      rows: [
        [
          { h: true, c: ['Date of Introduction'] },
          { h: false, c: [args.date] },
        ],
        [
          { h: true, c: ['Address'], rowSpan: 3 },
          { h: false, c: [args.role] },
        ],
        [{ h: false, c: [args.po] }],
        [{ h: false, c: [args.place] }],
      ],
    },
  ],
};
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(article, null, 2) + '\n');

// the card on Know About PPCs, in pincode order (then article number order)
const indexFile = path.join(data, 'blogIndex.json');
const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
const section = index.find((s) => s.name === state);
if (!section) {
  console.error('No section called "' + state + '" in blogIndex.json');
  process.exit(1);
}
const key = (slug) => [parseInt(slug, 10), parseInt((/-(\d+)$/.exec(slug) || [0, 0])[1], 10), slug];
const cmp = (a, b) => key(a)[0] - key(b)[0] || key(a)[1] - key(b)[1];
const entry = { code: args.state, slug: args.slug, img: args.image, name: args.title, ...(args.seasonal ? { seasonal: true } : {}) };
const at = section.items.findIndex((e) => cmp(e.slug, args.slug) > 0);
section.items.splice(at < 0 ? section.items.length : at, 0, entry);
fs.writeFileSync(indexFile, JSON.stringify(index, null, 2) + '\n');

console.log('Created ' + path.relative(process.cwd(), file));
console.log('Added the card to Know About PPCs (' + state + ').');
console.log('Next: write the paragraphs in that file, and add the PPC to src/data/ppcs.json.');
