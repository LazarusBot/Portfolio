"""Importe les études de cas publiées sur maxence.fyi (Framer) en JSON.

    python3 tools/import-framer.py            # texte + liens d'images Framer
    python3 tools/import-framer.py --download # télécharge aussi les images dans test/assets/img

Ne garde que ce qui est visible en desktop (Framer met toutes les variantes
mobile/desktop dans le HTML et masque les autres en CSS).
"""
import json, os, re, sys, urllib.request
from html.parser import HTMLParser

SITE = 'https://maxence.fyi'
SLUGS = ['podz', 'peregresss', 'aerrunning', 'raisingstd', 'logoset', 'carddi', 'axeinos',
         'sensia', 'quantum', 'padelwlrd', 'appstore']
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src', 'projects')
IMG_DIR = os.path.join(ROOT, 'test', 'assets', 'img')
MAX_W = 1600
VOID = {'img', 'br', 'meta', 'link', 'input', 'hr', 'source', 'path', 'use', 'rect', 'circle', 'stop'}


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def hidden_classes(html, width=1440):
    hidden = set()
    for cond, cls in re.findall(r'@media\s*\(([^)]*)\)\s*\{\.(hidden-[a-z0-9]+)\{display:none', html):
        lo = re.search(r'min-width:\s*([\d.]+)', cond)
        hi = re.search(r'max-width:\s*([\d.]+)', cond)
        if (not lo or width >= float(lo.group(1))) and (not hi or width <= float(hi.group(1))):
            hidden.add(cls)
    return hidden


class Page(HTMLParser):
    def __init__(self, hidden):
        super().__init__()
        self.hidden, self.stack, self.skip, self.items = hidden, [], 0, []
        self.weight = None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in VOID:
            if not self.skip and tag == 'img' and 'framerusercontent.com/images/' in (a.get('src') or ''):
                self.items.append({'type': 'img', 'src': a['src']})
            return
        hid = tag in ('script', 'style', 'noscript', 'svg') or any(c in self.hidden for c in (a.get('class') or '').split())
        self.stack.append((tag, hid))
        self.skip += hid
        if not self.skip and tag in ('p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'):
            m = re.search(r'--framer-font-weight:(\d+)', a.get('style') or '')
            self.weight = int(m.group(1)) if m else 400

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if tag in ('p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'):
            self.close_text()
        while self.stack:
            t, hid = self.stack.pop()
            self.skip -= hid
            if t == tag:
                break

    def handle_data(self, data):
        text = ' '.join(data.split())
        if self.skip or not text:
            return
        last = self.items[-1] if self.items else None
        if last and last['type'] == 'text' and last['weight'] == self.weight and last.get('open'):
            last['text'] += ' ' + text
        else:
            self.items.append({'type': 'text', 'text': text, 'weight': self.weight or 400, 'open': True})

    def close_text(self):
        if self.items and self.items[-1]['type'] == 'text':
            self.items[-1]['open'] = False


def parse(slug, html):
    p = Page(hidden_classes(html))
    p.feed(html)
    items = p.items
    texts = [i['text'] for i in items if i['type'] == 'text']
    # Fil d'Ariane "Home /" puis le titre du projet
    start = texts.index('Home /') + 1 if 'Home /' in texts else 0
    title = texts[start] if start else slug
    seen_title = False
    sections, current, seen_imgs = [], None, set()
    for i in items:
        if i['type'] == 'text':
            if not seen_title:
                seen_title = i['text'] == title
                continue
            # Titre de section : en gras, ou en medium s'il est court et sans ponctuation finale
            short = len(i['text']) < 40 and not i['text'].endswith(('.', ':', '!', '?', '"'))
            if i['weight'] >= 600 and len(i['text']) < 60 or i['weight'] == 500 and short:
                current = {'title': i['text'], 'text': [], 'images': []}
                sections.append(current)
            elif current:
                current['text'].append(i['text'])
        elif current and seen_title:
            img_id = i['src'].split('?')[0].rsplit('/', 1)[-1]
            if img_id in seen_imgs:
                continue
            seen_imgs.add(img_id)
            size = re.search(r'width=(\d+)&height=(\d+)', i['src'])
            current['images'].append({'id': img_id, 'w': int(size.group(1)) if size else None,
                                      'h': int(size.group(2)) if size else None})
    return {'slug': slug, 'title': title, 'sections': sections}


def download(img):
    os.makedirs(IMG_DIR, exist_ok=True)
    path = os.path.join(IMG_DIR, img['id'])
    if not os.path.exists(path):
        url = f"https://framerusercontent.com/images/{img['id']}"
        if img['w'] and img['w'] > MAX_W and not img['id'].endswith('.gif'):
            url += f'?scale-down-to={MAX_W}'
        with open(path, 'wb') as f:
            f.write(fetch(url))
    return os.path.getsize(path)


def main():
    os.makedirs(OUT, exist_ok=True)
    total = 0
    for slug in SLUGS:
        data = parse(slug, fetch(f'{SITE}/{slug}').decode('utf-8'))
        n = sum(len(s['images']) for s in data['sections'])
        if '--download' in sys.argv:
            for s in data['sections']:
                for img in s['images']:
                    total += download(img)
        with open(os.path.join(OUT, f'{slug}.json'), 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"{slug:12} {data['title']:22} {len(data['sections'])} sections, {n} images")
    if total:
        print(f'Images : {total / 1e6:.1f} Mo')


if __name__ == '__main__':
    main()
