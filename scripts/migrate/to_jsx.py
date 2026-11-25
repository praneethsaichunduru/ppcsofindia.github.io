"""Turn an HTML fragment (as parsed by htmltree) into JSX source. One-time migration helper."""
import posixpath
import re
from urllib.parse import urlsplit

from htmltree import Node, VOID

INLINE = {'a', 'b', 'i', 'u', 'em', 'strong', 'span', 'small', 'sub', 'sup', 'code', 'br', 'img', 'label', 'abbr',
          'mark', 'svg', 'text', 'tspan', 'input', 'button', 'select', 'textarea', 'time', 'font', 'path', 'rect',
          'circle', 'line', 'polygon', 'polyline', 'g', 'title', 'defs', 'marker'}

ATTR_MAP = {
    'class': 'className', 'for': 'htmlFor', 'tabindex': 'tabIndex', 'colspan': 'colSpan', 'rowspan': 'rowSpan',
    'viewbox': 'viewBox', 'refx': 'refX', 'refy': 'refY', 'markerwidth': 'markerWidth', 'markerheight': 'markerHeight',
    'preserveaspectratio': 'preserveAspectRatio', 'crossorigin': 'crossOrigin', 'srcset': 'srcSet', 'maxlength': 'maxLength',
    'readonly': 'readOnly', 'autocomplete': 'autoComplete', 'frameborder': 'frameBorder', 'cellpadding': 'cellPadding',
    'cellspacing': 'cellSpacing', 'xlink:href': 'xlinkHref', 'xmlns:xlink': 'xmlnsXlink',
}
DROP_ATTRS = {'onclick', 'onkeyup', 'onchange', 'onload', 'onerror', 'onsubmit', 'onmouseover', 'onmouseout'}
BOOLEAN = {'hidden', 'checked', 'disabled', 'selected', 'open', 'readonly', 'required', 'autofocus', 'multiple'}


def camel(name):
    if name.startswith(('data-', 'aria-')):
        return name
    if name in ATTR_MAP:
        return ATTR_MAP[name]
    if '-' in name:
        parts = name.split('-')
        return parts[0] + ''.join(p.capitalize() for p in parts[1:])
    return name


def style_obj(css):
    items = []
    for decl in css.split(';'):
        if ':' not in decl:
            continue
        k, v = decl.split(':', 1)
        k = k.strip()
        if k.startswith('--'):
            key = "'%s'" % k
        else:
            key = re.sub(r'-([a-z])', lambda m: m.group(1).upper(), k)
        items.append("%s: %s" % (key, js_str(v.strip())))
    return '{{ ' + ', '.join(items) + ' }}'


def js_str(s):
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"


def resolve(page_url, ref):
    """Absolute site path for a link or picture written relative to the page at page_url (e.g. '/blog/ka/x.html')."""
    if ref.startswith('/'):
        return ref
    base = posixpath.dirname(page_url)
    p = posixpath.normpath(posixpath.join(base, ref))
    return '/' + p.lstrip('/')


def is_external(href):
    return bool(re.match(r'^(https?:|mailto:|tel:|sms:|//)', href)) or href.startswith('#')


class Converter:
    def __init__(self, page_url):
        self.page_url = page_url
        self.uses_link = False

    # ---- attributes -----------------------------------------------------------------------
    def attrs(self, n):
        out = []
        tag = n.tag
        for k, v in n.attrs.items():
            if k == 'onclick' and isinstance(v, str):
                m = re.fullmatch(r"\s*window\.location\.href\s*=\s*'([^']*)'\s*;?\s*", v)
                if m:
                    out.append("onClick={() => { window.location.href = %s; }}" % js_str(m.group(1)))
                continue
            if k in DROP_ATTRS:
                continue
            if k == 'style' and isinstance(v, str):
                out.append('style=%s' % style_obj(v))
                continue
            key = camel(k)
            if v is True or (k in BOOLEAN):
                out.append(key)
                continue
            v = str(v)
            if tag == 'img' and k == 'src' and not v.startswith(('http', 'data:', '/')):
                v = resolve(self.page_url, v)
            if tag == 'a' and k == 'href' and not is_external(v):
                continue  # handled by link()
            v = v.replace('&', '&amp;').replace('"', '&quot;') if '&' in v and not re.search(r'&\w+;', v) else v.replace('"', '&quot;')
            out.append('%s="%s"' % (key, v))
        return out

    def link(self, n):
        href = str(n.attrs.get('href', ''))
        if is_external(href) or not href:
            return 'a', ['href="%s"' % href.replace('"', '&quot;')] if href else ['href="#"']
        parts = urlsplit(href)
        target = resolve(self.page_url, parts.path) if parts.path else self.page_url
        if target.endswith('.html'):
            if target == '/index.html':
                target = '/'
            self.uses_link = True
            suffix = ('#' + parts.fragment) if parts.fragment else ''
            return 'Link', ['to="%s%s"' % (target, suffix)]
        return 'a', ['href="%s"' % target.replace(' ', '%20')]

    # ---- nodes ----------------------------------------------------------------------------
    def children(self, parent, indent):
        kids = parent.children
        block_parent = parent.tag not in INLINE
        res = []
        n = len(kids)

        def is_block(x):
            return isinstance(x, Node) and (x.tag not in INLINE or x.tag == 'br')

        for i, c in enumerate(kids):
            if isinstance(c, str):
                t = re.sub(r'\s+', ' ', c)
                prev = kids[i - 1] if i else None
                nxt = kids[i + 1] if i + 1 < n else None
                if not t.strip():
                    # whitespace only
                    if (not prev and block_parent) or (not nxt and block_parent) or is_block(prev) or is_block(nxt):
                        continue
                    if not prev or not nxt:
                        continue
                    res.append("{' '}")
                    continue
                lead = t.startswith(' ')
                trail = t.endswith(' ')
                if block_parent and (not prev or is_block(prev)):
                    lead = False
                if block_parent and (not nxt or is_block(nxt)):
                    trail = False
                body = t.strip()
                body = re.sub(r'[{}>]', lambda m: {'{': "{'{'}", '}': "{'}'}", '>': '&gt;'}[m.group(0)], body)
                piece = ("{' '}" if lead else '') + body + ("{' '}" if trail else '')
                res.append(piece)
            else:
                res.append(self.node(c, indent))
        return res

    def node(self, n, indent):
        tag = n.tag
        if tag == 'script' or tag == 'style' or tag == 'noscript':
            return ''
        attrs = self.attrs(n)
        name = tag
        if tag == 'a':
            name, extra = self.link(n)
            attrs = [a for a in attrs if not a.startswith('href')] + extra
            if n.attrs.get('target') == '_blank' and not any(a.startswith('rel=') for a in attrs):
                attrs.append('rel="noopener noreferrer"')
        open_tag = '<' + name + (' ' + ' '.join(attrs) if attrs else '')
        if tag in VOID or (not n.children and tag not in ('div', 'span', 'p', 'td', 'th', 'a', 'b', 'i', 'li', 'ul', 'text', 'title')):
            return open_tag + ' />'
        inner = self.children(n, indent + 1)
        if not inner:
            return open_tag + '></' + name + '>'
        return open_tag + '>' + ''.join(inner) + '</' + name + '>'

    def fragment(self, nodes_parent):
        pieces = self.children(nodes_parent, 0)
        return '\n'.join(pieces)
