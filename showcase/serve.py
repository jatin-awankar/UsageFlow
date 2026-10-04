"""Local static-only review server; no application endpoints or runtime services."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class StaticServer(ThreadingHTTPServer):
    # Concurrent browser tests request many export chunks at once. Python 3.9's
    # default backlog of five can reset those connections and force hard reloads.
    request_queue_size = 128


if __name__ == "__main__":
    directory = Path(__file__).resolve().parent / "out"
    handler = partial(SimpleHTTPRequestHandler, directory=str(directory))
    with StaticServer(("127.0.0.1", 3211), handler) as server:
        server.serve_forever()
