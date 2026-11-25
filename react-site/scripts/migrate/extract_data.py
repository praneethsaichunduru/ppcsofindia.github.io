"""One-time migration: pull the site's content out of the old .html pages into JSON data files.

  src/data/ppcs.json                 every PPC in the list (list-pincode.html)
  src/data/blogIndex.json            the Know About PPCs entries, by state (blog/blog-main.html)
  src/data/blog/<code>/<slug>.json   one file per article (blog/<code>/<slug>.html)
  src/data/special/<year>.json       the Special Cancellations tables
"""
import glob
import html
import json
import os
import posixpath
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from htmltree import Node, find, parse  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
OUT = os.path.join(ROOT, 'react-site', 'src', 'data')


def write_json(path, data, indent=None):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(data, f, ensure_ascii=False, indent=indent, separators=None if indent else (',', ':'))
        f.write('\n')


def ws(s):
    return re.sub(r'\s+', ' ', html.unescape(s)).strip()


def cell_texts(tr):
    return [ws(td.text()) for td in tr.children if isinstance(td, Node) and td.tag in ('td', 'th')]


# ------------------------------------------------------------------------------------ PPC list
def extract_ppcs():
    src = open(os.path.join(ROOT, 'list-pincode.html'), encoding='utf-8').read()
    tree = parse(src[src.index('<tbody>'):src.index('</tbody>')])
    rows = []
    for tr in tree.find_all(lambda n: n.tag == 'tr' and 'data-row' in n.cls()):
        status = [c for c in tr.cls() if c != 'data-row'][0]
        c = cell_texts(tr)
        img = find(tr, lambda n: n.tag == 'img').attrs['src'].split('/')[-1]
        rows.append({'sno': int(c[0]), 'status': status, 'name': c[1], 'date': c[2], 'po': c[3], 'district': c[4], 'state': c[5], 'pin': c[6], 'img': img})
    write_json(os.path.join(OUT, 'ppcs.json'), rows)
    return rows


# ------------------------------------------------------------------------------------ blog articles
def page_url(code, slug):
    return '/blog/%s/%s.html' % (code, slug)


def resolve(url, ref):
    if ref.startswith(('/', 'http')):
        return ref
    return '/' + posixpath.normpath(posixpath.join(posixpath.dirname(url), ref)).lstrip('/')


def inline(node, url):
    """Children of a text element as a list of strings and {t, c, ...} objects."""
    out = []
    for c in node.children:
        if isinstance(c, str):
            t = html.unescape(re.sub(r'\s+', ' ', c))
            if t:
                out.append(t)
        elif c.tag == 'br':
            out.append({'t': 'br'})
        else:
            o = {'t': c.tag}
            if c.tag == 'a':
                href = c.attrs.get('href', '')
                o['href'] = href if href.startswith(('http', 'mailto', '#')) else resolve(url, href)
                if c.attrs.get('target'):
                    o['target'] = c.attrs['target']
            if c.cls():
                o['cls'] = ' '.join(c.cls())
            kids = inline(c, url)
            if kids:
                o['c'] = kids
            out.append(o)
    return out


def trim(parts):
    if parts and isinstance(parts[0], str):
        parts[0] = parts[0].lstrip()
    if parts and isinstance(parts[-1], str):
        parts[-1] = parts[-1].rstrip()
    return [p for p in parts if p != '']


def gallery(div, url):
    """A gallery is a list of boxes; a box usually holds one picture and its caption, but may hold several."""
    items = []
    for box in div.children:
        if not isinstance(box, Node) or box.tag != 'div':
            continue
        current = None
        for c in box.children:
            if not isinstance(c, Node):
                continue
            imgs = [c] if c.tag == 'img' else c.find_all(lambda n: n.tag == 'img')
            if c.tag == 'p' and 'credits' in c.cls():
                if current is not None:
                    current['credit'] = ws(c.text())
                continue
            for img in imgs:
                current = {'src': resolve(url, img.attrs['src']), 'alt': html.unescape(img.attrs.get('alt', ''))}
                if img.attrs.get('class'):
                    current['cls'] = img.attrs['class']
                items.append(current)
    return {'t': 'gallery', 'items': items}


def table(t, url):
    rows = []
    for tr in t.find_all(lambda n: n.tag == 'tr'):
        cells = []
        for td in tr.children:
            if isinstance(td, Node) and td.tag in ('td', 'th'):
                c = {'h': td.tag == 'th', 'c': trim(inline(td, url))}
                if td.attrs.get('rowspan'):
                    c['rowSpan'] = int(td.attrs['rowspan'])
                if td.attrs.get('colspan'):
                    c['colSpan'] = int(td.attrs['colspan'])
                cells.append(c)
        rows.append(cells)
    return {'t': 'table', 'cls': ' '.join(t.cls()), 'rows': rows}


def blocks(container, url):
    out, titles = [], []
    for n in container.children:
        if isinstance(n, str):
            if n.strip():
                raise ValueError('loose text: %r' % n.strip()[:60])
            continue
        if n.tag == 'h1':
            titles.append(ws(n.text()))
        elif n.tag in ('h2', 'h3', 'h4', 'h5'):
            out.append({'t': 'h', 'l': int(n.tag[1]), 'text': ws(n.text())})
        elif n.tag == 'p':
            b = {'t': 'p', 'c': trim(inline(n, url))}
            if n.cls():
                b['cls'] = ' '.join(n.cls())
            out.append(b)
        elif n.tag == 'div' and 'overview-images' in n.cls():
            out.append(gallery(n, url))
        elif n.tag == 'table':
            out.append(table(n, url))
        elif n.tag in ('b', 'i', 'u', 'em', 'strong', 'span'):
            holder = Node('#holder')
            holder.children.append(n)
            out.append({'t': 'inline', 'c': inline(holder, url)})
        else:
            raise ValueError('unexpected <%s class=%s>' % (n.tag, n.cls()))
    return titles, out


def extract_blog():
    count = 0
    for path in sorted(glob.glob(os.path.join(ROOT, 'blog', '*', '*.html'))):
        code = os.path.basename(os.path.dirname(path))
        if code == 'blog-related-pictures':
            continue
        slug = os.path.basename(path)[:-5]
        src = open(path, encoding='utf-8').read()
        doc_title = ws(re.search(r'<title>(.*?)</title>', src, re.S).group(1))
        tree = parse(src[src.index('<body'):])
        cont = find(tree, lambda n: n.tag == 'div' and 'container' in n.cls())
        titles, body = blocks(cont, page_url(code, slug))
        data = {'docTitle': doc_title, 'title': titles[0], 'body': body}
        if len(titles) > 1:
            data['regional'] = titles[1]
        if len(titles) > 2:
            raise ValueError('%s has %d titles' % (path, len(titles)))
        write_json(os.path.join(OUT, 'blog', code, slug + '.json'), data)
        count += 1
    return count


# ------------------------------------------------------------------------------------ Know About index
def extract_blog_index():
    src = open(os.path.join(ROOT, 'blog', 'blog-main.html'), encoding='utf-8').read()
    data = src[src.index('<template id="ppc-data">'):src.index('</template>')]
    tree = parse(data)
    states = []
    for sec in tree.find_all(lambda n: n.tag == 'div' and 'section' in n.cls()):
        items = []
        for d in sec.find_all(lambda n: n.tag == 'div' and 'overview-images' not in n.cls() and 'section-divider' not in n.cls() and 'section' not in n.cls()):
            a = find(d, lambda n: n.tag == 'a')
            img = find(d, lambda n: n.tag == 'img')
            nm = find(d, lambda n: n.tag == 'p' and 'ppc-name' in n.cls())
            if not a or not img:
                continue
            href = a.attrs['href']
            code, file = href.split('/')
            item = {'code': code, 'slug': file[:-5], 'img': img.attrs['src'].split('/')[-1], 'name': ws(nm.text())}
            if 'data-seasonal' in d.attrs:
                item['seasonal'] = True
            items.append(item)
        states.append({'name': sec.attrs['id'], 'items': items})
    write_json(os.path.join(OUT, 'blogIndex.json'), states)
    return states


# ------------------------------------------------------------------------------------ Special Cancellations
def extract_special():
    for year in (2023, 2024, 2025):
        src = open(os.path.join(ROOT, 'special-cancellations-%d.html' % year), encoding='utf-8').read()
        tree = parse(src[src.index('<body'):])
        thead = find(tree, lambda n: n.tag == 'thead')
        heads = cell_texts(find(thead, lambda n: n.tag == 'tr'))
        rows, groups = [], []
        tbody = find(tree, lambda n: n.tag == 'tbody')
        for tr in tbody.children:
            if not isinstance(tr, Node) or tr.tag != 'tr':
                continue
            if 'line-partition' in tr.cls():
                if rows:
                    rows[-1]['sep'] = True  # a divider line follows this row
                continue
            if 'data-row' not in tr.cls():
                continue
            c = cell_texts(tr)
            img = find(tr, lambda n: n.tag == 'img')
            rows.append({'cls': [x for x in tr.cls() if x != 'data-row'][0], 'cells': c[:-1], 'img': img.attrs['src'], 'alt': html.unescape(img.attrs.get('alt', ''))})
        # the filter checkboxes
        flt = find(tree, lambda n: n.tag == 'section' and 'filter-container' in n.cls())
        states = [ws(l.text()) for l in flt.find_all(lambda n: n.tag == 'label')]
        title = ws(find(tree, lambda n: n.tag == 'h1').text())
        doc = ws(re.search(r'<title>(.*?)</title>', src, re.S).group(1))
        write_json(os.path.join(OUT, 'special', '%d.json' % year), {'title': title, 'docTitle': doc, 'heads': heads, 'states': states, 'rows': rows})
        print('special', year, len(rows), 'rows', states[:3])


if __name__ == '__main__':
    r = extract_ppcs()
    print('ppcs', len(r))
    n = extract_blog()
    print('blog pages', n)
    s = extract_blog_index()
    print('index', len(s), 'states', sum(len(x['items']) for x in s), 'entries')
    extract_special()
