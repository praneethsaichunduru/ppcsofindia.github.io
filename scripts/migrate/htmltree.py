"""Tiny HTML parser that builds a tree: element = {'tag','attrs','children'}, text = str.

Used by the one-time migration scripts that turn the old .html pages into React components and data files.
"""
from html.parser import HTMLParser

VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'}


class Node(dict):
    def __init__(self, tag, attrs=None):
        super().__init__(tag=tag, attrs=attrs or {}, children=[])

    @property
    def tag(self):
        return self['tag']

    @property
    def attrs(self):
        return self['attrs']

    @property
    def children(self):
        return self['children']

    def cls(self):
        return (self.attrs.get('class') or '').split()

    def find_all(self, pred):
        out = []
        for c in self.children:
            if isinstance(c, Node):
                if pred(c):
                    out.append(c)
                out.extend(c.find_all(pred))
        return out

    def text(self):
        return ''.join(c if isinstance(c, str) else c.text() for c in self.children)


class _Builder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.root = Node('#root')
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        n = Node(tag, {k: (v if v is not None else True) for k, v in attrs})
        self.stack[-1].children.append(n)
        if tag not in VOID:
            self.stack.append(n)

    def handle_startendtag(self, tag, attrs):
        n = Node(tag, {k: (v if v is not None else True) for k, v in attrs})
        self.stack[-1].children.append(n)

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        # close up to the nearest matching open element; stray end tags (e.g. "</a>" with no "<a>") are ignored
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                return

    def handle_data(self, data):
        self.stack[-1].children.append(data)

    def handle_entityref(self, name):
        self.stack[-1].children.append('&%s;' % name)

    def handle_charref(self, name):
        self.stack[-1].children.append('&#%s;' % name)

    def handle_comment(self, data):
        pass


def parse(html):
    b = _Builder()
    b.feed(html)
    b.close()
    return b.root


def find(node, pred):
    r = node.find_all(pred)
    return r[0] if r else None
