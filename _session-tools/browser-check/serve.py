"""Serve the built frontend and proxy /api to the Flask backend, like Vercel's rewrite does."""
import http.server, os, sys, urllib.request, urllib.error
BUILD = '/home/claude/work/frontend/build'
API = 'http://127.0.0.1:5055'
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=BUILD, **k)
    def log_message(self, *a): pass
    def _proxy(self):
        body = None
        n = int(self.headers.get('Content-Length') or 0)
        if n: body = self.rfile.read(n)
        req = urllib.request.Request(API + self.path, data=body, method=self.command)
        for k in ('Content-Type', 'Cookie'):
            if self.headers.get(k): req.add_header(k, self.headers[k])
        try: resp = urllib.request.urlopen(req)
        except urllib.error.HTTPError as e: resp = e
        data = resp.read()
        self.send_response(resp.status)
        for k, v in resp.headers.items():
            if k.lower() in ('content-type', 'set-cookie'): self.send_header(k, v)
        self.send_header('Content-Length', str(len(data)))
        self.end_headers(); self.wfile.write(data)
    do_POST = do_PUT = _proxy
    def do_GET(self):
        if self.path.startswith('/api/'): return self._proxy()
        path = self.path.split('?')[0]
        if path != '/' and not os.path.exists(os.path.join(BUILD, path.lstrip('/'))): self.path = '/index.html'
        return super().do_GET()
http.server.ThreadingHTTPServer(('127.0.0.1', 5056), H).serve_forever()
