"""One-time migration: turn the old static .html pages into React page components (src/pages/*.jsx)."""
import html as _html
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from htmltree import find, parse  # noqa: E402
from to_jsx import Converter  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))


def container_of(tree):
    return find(tree, lambda n: n.tag == 'div' and 'container' in n.cls())


def convert(src_name, page_url, comp, scope=None, share=False, extra_top=None, out_dir='src/pages'):
    html = open(os.path.join(ROOT, src_name), encoding='utf-8').read()
    title = _html.unescape(re.search(r'<title>(.*?)</title>', html, re.S).group(1).strip())
    body = html[html.index('<body'):]
    tree = parse(body)
    cont = container_of(tree)
    c = Converter(page_url)
    jsx = c.fragment(cont)
    if extra_top:
        jsx = extra_top(tree, c) + '\n' + jsx
    imports = ["import Page from '../components/Page.jsx';"]
    if c.uses_link:
        imports.insert(0, "import { Link } from 'react-router-dom';")
    css = '\n\n'.join(x.strip('\n') for x in re.findall(r'<style>(.*?)</style>', html, re.S))
    has_css = bool(scope and css.strip())
    if has_css:
        with open(os.path.join(ROOT, 'react-site', 'src', 'styles', 'pages', scope + '.css'), 'w', encoding='utf-8') as f:
            f.write(css + '\n')
        imports.append("import '../styles/pages/%s.css';" % scope)
    tp = '{%r}' % title if ('"' in title or "'" in title) else '"%s"' % title
    props = 'title=%s%s%s' % (tp, (' scope="%s"' % scope) if has_css else '', ' share' if share else '')
    src = "%s\n\nexport default function %s() {\n  return (\n    <Page %s>\n%s\n    </Page>\n  );\n}\n" % ('\n'.join(imports), comp, props, jsx)
    out = os.path.join(ROOT, 'react-site', out_dir, comp + '.jsx')
    with open(out, 'w', encoding='utf-8') as f:
        f.write(src)
    return out


def defs_svg(tree, c):
    svg = find(tree, lambda n: n.tag == 'svg' and n.attrs.get('width') == '0')
    return c.node(svg, 0) if svg else ''


SPECS = [
    ('index.html', '/index.html', 'Home', None, True, None),
    ('contact.html', '/contact.html', 'Contact', 'contact', False, None),
    ('address.html', '/address.html', 'Address', 'address', False, None),
    ('stamp-maps.html', '/stamp-maps.html', 'StampMaps', 'stamps', True, None),
    ('copyright-notice.html', '/copyright-notice.html', 'Copyright', 'copyright', False, None),
    ('special-cancellations.html', '/special-cancellations.html', 'SpecialHome', None, False, None),
    ('how-to-collect.html', '/how-to-collect.html', 'HowToCollect', 'howto', False, defs_svg),
]

if __name__ == '__main__':
    for src_name, url, comp, scope, share, top in SPECS:
        print(convert(src_name, url, comp, scope, share, top))
