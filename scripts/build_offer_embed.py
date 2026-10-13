"""Derive embeddable gastro offer from the published landing, never a second price list."""
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'ksiegowosc-dla-gastronomii'
s=(p/'index.html').read_text()
m=re.search(r'<section\b[^>]*id="obsluga"[^>]*>.*?</section>',s,re.S)
if not m: raise SystemExit('Missing offer section: refusing stale offer publication')
body=m.group()
if 'price-basic' not in body or 'price-extended' not in body:raise SystemExit('Missing package calculator')
url='https://po-pierwsze-zysk.pl/ksiegowosc-dla-gastronomii/'
body=re.sub(r' data-select-package="[^"]+"','',body)
body=body.replace('href="#kontakt"','href="'+url+'#kontakt" target="_top" data-offer-link')
html='''<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><title>Pakiety księgowości i raportowania — Po pierwsze: zysk</title><link rel="stylesheet" href="assets/style.css"><style>body{background:#fffdf8}.wrap{width:calc(100% - 32px)}.section{padding:24px 0}.pricing-intro{display:block}.pricing-intro h2{font-size:32px}.pricing-intro-copy{margin-top:18px}.packages{gap:24px}body{font-size:16px}</style></head><body>'''+body+'''<p style="padding:0 16px"><a data-offer-link target="_top" href="'''+url+'''">Pełna oferta i kontakt — Po pierwsze: zysk →</a></p><script src="assets/pricing.js"></script><script src="assets/offer-embed.js"></script></body></html>'''
(p/'oferta-osadzona.html').write_text(html)
