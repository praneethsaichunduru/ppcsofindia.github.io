# PPCs of India: the React site

This folder is the website rebuilt with React. It looks and behaves like the old HTML site, at the same addresses
(`/list-pincode.html`, `/blog/ka/562168-helagalli-bo.html`, and so on). The old HTML site is the one in the folder above, which is the one
currently published. This folder is kept for later; nothing here is published yet.

## What you need

[Node.js](https://nodejs.org) (the LTS version). Then, once, in this folder:

```
npm install
```

## Everyday commands (run them in this folder)

| Command                      | What it does                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| `npm run dev`                | Opens the site on your computer (http://localhost:5173) and updates as you save files. |
| `npm run build`              | Builds the finished site into `dist/` (503 ready-made pages).                          |
| `npm run preview`            | Serves `dist/` locally, to check the finished build.                                   |
| `npm run new-article -- ...` | Starts a new article about a PPC (see "Adding a PPC" below).                           |

Publishing is automatic: when you push to `main`, GitHub builds the site and publishes it
(`.github/workflows/deploy.yml`). One-time setting: on GitHub, **Settings > Pages > Build and deployment > Source: GitHub Actions**.

## Where things are

| What                                                           | Where                                                                                                                                                                |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The PPC List and the Dashboard                                 | `src/data/ppcs.json`, one object per PPC, in list order (S. No. follows the order).                                                                                  |
| An article about a PPC                                         | `src/data/blog/<state>/<article>.json`                                                                                                                               |
| The cards on Know About PPCs                                   | `src/data/blogIndex.json` (one entry per article, per state, in pincode order; `"seasonal": true` marks a seasonal post office).                                     |
| The PO Map's pins                                              | `src/data/poPins.json` (DIGIPIN, post office, rank, pincode, PPC). Set `"sample": false` when the list is real.                                                      |
| The India outline                                              | `src/data/indiaMap.json`                                                                                                                                             |
| Special Cancellations tables (pages not linked from the menus) | `src/data/special/<year>.json`                                                                                                                                       |
| The menu and footer links                                      | `src/components/nav.js`                                                                                                                                              |
| The pages                                                      | `src/pages/` (one file per page)                                                                                                                                     |
| Styles                                                         | `src/styles/theme.css` (the shared design), `src/styles/pages/<page>.css` (one per page; each is applied only inside its own page)                                   |
| Pictures                                                       | Not here: the site uses the repository's own `pictures/` and `blog/blog-related-pictures/` folders (in the folder above), at the same addresses as before. |

## Adding a PPC

1. Add the scan to `pictures/ppcs/`.
2. Add one line for it in `src/data/ppcs.json`, in the right place. Fields: `status` (Working, Doubtful, Removed, Replaced), `name`, `date` (`dd.mm.yyyy` or `Not Available`),
   `po` (e.g. `Hikkim BO`), `district`, `state`, `pin`, `img` (the scan's file name). The S. No. column numbers itself.
3. Start the article and its card:

   ```
   npm run new-article -- --state ka --slug 562168-helagalli-bo --title "Grizzled Giant Squirrel" --regional "ಕಡಲೆ ಅಳಿಲು" \
       --image 562168-GrizzledGiantSquirrel-HelagalliBO.jpg --date "January 21, 2022" \
       --role "Branch Postmaster," --po "Helagalli BO," --place "Ramanagara (dt.), Karnataka - 562168."
   ```

   Add `--seasonal` for a post office that is open only part of the year. Then open the new `.json` file and write the paragraphs
   (each one is an object like `{ "t": "p", "c": ["Your text"] }`; copy an existing article to see galleries, headings and tables).
   When a post office has several PPCs, the articles are numbered `-1`, `-2`, ... by date of introduction, then by name.

4. The dates, post office ranks, and the Know About PPCs card come from these files; nothing else needs editing.

## How it is built

React with Vite, and `vite-react-ssg`, which prepares every page as real HTML ahead of time (so search engines can read them)
and then lets React take over in the browser. Page styles are scoped by a small plugin in `vite.config.js`, so one page's CSS can never affect another.
`scripts/migrate/` holds the one-time tools that converted the old HTML pages into this data; they are not needed again.
