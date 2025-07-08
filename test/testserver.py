from http.server import SimpleHTTPRequestHandler
from socketserver import TCPServer
import os, argparse
from pathlib import Path
BASEPATH = os.path.dirname(os.path.realpath(__file__))

def sendx(self, typ, c):
  self.send_response(200)
  self.send_header('Content-type',typ)
  self.end_headers()
  self.wfile.write(c)

def server(port=80):
  directory = os.path.join(BASEPATH,'..')
  class VyJSHTTPRequestHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
      if self.path == '/':
        self.path = '/test/main.html';
        self.do_GET()
      else:
        exclude = set(['.git','.hg','.pycache','node_modules'])
        for root, dirs, files in os.walk(directory, topdown=True):
          dirs[:] = [d for d in dirs if d not in exclude]
          for f in files:
            fname = os.path.join(root,f)
            rpath = '/'+os.path.relpath(fname,directory).replace('\\','\/')
            print(self.path, rpath, flush=True)
            if self.path == rpath and '..' not in self.path:
              if fname.endswith('.html'):
                sendx(self, 'text/html', Path(fname).read_text().encode())
              elif fname.endswith('.json'):
                sendx(self, 'application/json', Path(fname).read_text().encode())
              elif fname.endswith('.js'):
                sendx(self, 'text/javascript', Path(fname).read_text().encode())
              elif fname.endswith('.css'):
                sendx(self, 'text/css', Path(fname).read_text().encode())
              return True
        self.send_response(404)
        self.end_headers()

  print('Serving vyjs test on http://localhost:{p}'.format(p=port),flush=True)
  TCPServer.allow_reuse_address = True
  with TCPServer(("", port), VyJSHTTPRequestHandler) as httpd:
    httpd.serve_forever()
  
if __name__ == '__main__':
  parser = argparse.ArgumentParser(prog='test server', description='test server')
  parser.add_argument('--port', type=int, default=80, help='server port number')
  args = parser.parse_args()
  server(port=args.port)