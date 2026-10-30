#!/usr/bin/env python3
"""Local verification proxy for the Madarek mobile web export.

Serves the static export at / and forwards /api/v1/* to the real backend.
Server-side requests carry no Origin header, so the backend's CORS
allow-list (which only governs browsers) accepts them — the same way the
native app talks to the API. Set-Cookie headers are forwarded for the
client-side refresh-token capture.
"""
import http.server
import http.client
import os
import socketserver
import urllib.parse
import ssl

PORT = 9999
DIST = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dist-web"))
HOST = "madarek.onrender.com"

ctx = ssl.create_default_context()


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST, **kwargs)

    def log_message(self, fmt, *args):
        pass

    def _proxy(self):
        parsed = urllib.parse.urlparse(self.path)
        conn = http.client.HTTPSConnection(HOST, context=ctx, timeout=60)
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length) if length else None
        headers = {}
        for key in ("Authorization", "Content-Type", "Cookie", "Accept", "User-Agent"):
            if self.headers.get(key):
                headers[key] = self.headers[key]
        try:
            conn.request(self.command, parsed.path, body=body, headers=headers)
            res = conn.getresponse()
            payload = res.read()
        except Exception as exc:  # noqa: BLE001
            payload = (
                '{"error":{"code":"NETWORK","message":"تعذّر الاتصال بالخادم — تحقّق من اتصالك بالإنترنت ثم أعد المحاولة."}}'
            ).encode()
            self.send_response(503)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(payload)
            return
        self.send_response(res.status)
        seen = set()
        for key, value in res.getheaders():
            if key.lower() in ("transfer-encoding", "content-encoding", "content-length", "connection"):
                continue
            if key.lower() == "set-cookie" and key.lower() in seen:
                continue
            if key.lower() in ("set-cookie", "cache-control", "content-type", "ratelimit-remaining", "ratelimit-limit"):
                seen.add(key.lower())
                self.send_header(key, value)
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        if self.path.startswith("/api/v1"):
            self._proxy()
        else:
            # SPA fallback: deep links serve index.html (file-less routes)
            parsed = urllib.parse.urlparse(self.path)
            candidate = os.path.normpath(os.path.join(DIST, urllib.parse.unquote(parsed.path.lstrip("/"))))
            has_ext = os.path.splitext(parsed.path)[1] != ""
            if (not has_ext or not os.path.isfile(candidate)) and not os.path.isfile(candidate):
                if has_ext:
                    super().do_GET()
                    return
                self.path = "/index.html"
            super().do_GET()

    def do_POST(self):
        self._proxy()

    def do_PATCH(self):
        self._proxy()

    def do_PUT(self):
        self._proxy()

    def do_DELETE(self):
        self._proxy()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS")
        self.end_headers()


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    print(f"serving {DIST} + proxying /api/v1 → https://{HOST} on :{PORT}")
    Server(("0.0.0.0", PORT), Handler).serve_forever()
