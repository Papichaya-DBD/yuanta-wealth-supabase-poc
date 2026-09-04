#!/usr/bin/env python3
"""
Local dev router for the Supabase PoC pages.

Production uses clean URLs (e.g. /wealth-insights, /wealth-single-weekly-buy-list/<slug>)
that don't exist as files here. This maps those clean paths to the actual local .html files
so clicking through nav/footer/article-card links works while testing locally, instead of
404ing. Anything not in ROUTES falls through to plain static file serving.

Update ROUTES as more pages get cloned into this repo.
"""
import http.server
import urllib.parse

PORT = 8934

# Exact-path routes (nav, footer, section "view all" links)
EXACT_ROUTES = {
    '/': 'home.html',
    '/wealth-whyus': 'why-us.html',
    '/why-us': 'why-us.html',
    '/why-us.html': 'why-us.html',
    '/wealth-privilegesandevents': 'privileges-events.html',
    '/privileges-events': 'privileges-events.html',
    '/privileges-events.html': 'privileges-events.html',
    '/wealth-insights': 'insights.html',
    '/wealth-contactus': 'contact-us.html',
    '/contact-us': 'contact-us.html',
    '/contact-us.html': 'contact-us.html',
    '/wealth-single-events': 'single-event.html',
    '/wealth-weekly-report': 'weekly-pdf.html',
    '/wealth-monthly-report': 'monthly-pdf.html',
}

# Prefix routes (single-article pages, production keeps the slug after the prefix —
# our PoC pages don't do slug-based routing yet, they just load the latest row, so the
# slug segment is ignored and the same file is served regardless of what follows).
PREFIX_ROUTES = {
    '/wealth-single-weekly-hotissue/':            'single-hot-issue.html',
    '/wealth-single-weekly-asset-performance/':   'single-asset-performance.html',
    '/wealth-single-weekly-buy-list/':            'single-buy-list.html',
    '/wealth-single-weekly-market-calendar/':     'single-weekly-market-calendar.html',
    '/wealth-single-monthly-hotissue/':           'single-monthly-hot-issue.html',
    '/wealth-single-monthly-asset-performance/':  'single-monthly-asset-performance.html',
    '/wealth-single-monthly-buy-list/':           'single-monthly-buy-list.html',
    '/wealth-single-monthly-market-calendar/':    'single-monthly-market-calendar.html',
    '/wealth-single-monthly-market-outlook/':     'single-monthly-market-outlook.html',
    '/wealth-single-monthly-asset-class-outlook/':'single-monthly-asset-class-outlook.html',
    '/wealth-single-events':                      'single-event.html',
}

NOT_BUILT_YET = """<!doctype html><meta charset="utf-8">
<body style="font-family:sans-serif;padding:60px;text-align:center;color:#3d506e;">
<h2>ยังไม่ได้ทำหน้านี้ใน PoC</h2>
<p>เส้นทาง <code>{path}</code> ยังไม่มีไฟล์ตรงกันใน repo นี้ (ดู ROUTES ใน devserver.py)</p>
<p><a href="/">กลับหน้า Home</a></p>
</body>"""


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        clean_path = parsed.path.rstrip('/') or '/'

        target = EXACT_ROUTES.get(clean_path) or EXACT_ROUTES.get(parsed.path)
        if not target:
            for prefix, filename in PREFIX_ROUTES.items():
                if parsed.path.startswith(prefix):
                    target = filename
                    break

        if target:
            try:
                with open(target, 'rb') as f:
                    body = f.read()
                self.send_response(200)
                self.send_header('Content-type', 'text/html; charset=utf-8')
                self.send_header('Content-Length', str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            except FileNotFoundError:
                body = NOT_BUILT_YET.format(path=parsed.path).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-type', 'text/html; charset=utf-8')
                self.send_header('Content-Length', str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            return

        # Not a known clean route — serve as a normal static file (the actual .html
        # files themselves, plus anything else in the repo).
        super().do_GET()

    def log_message(self, format, *args):
        pass


if __name__ == '__main__':
    server = http.server.HTTPServer(('localhost', PORT), Handler)
    print('Serving on http://localhost:%d' % PORT)
    server.serve_forever()
