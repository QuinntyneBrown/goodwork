// Serves the production build of the Angular app, gzip-compressed, with a fallback to index.html.
// This is the only server the e2e suite starts: no API, database or container.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGzip } from 'node:zlib';

const root = resolve(
  fileURLToPath(new URL('../../frontend/dist/goodwork/browser', import.meta.url)),
);
const port = Number(process.env.PORT ?? 4200);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
};
const compressible = new Set(['.html', '.js', '.css', '.json', '.svg']);

createServer((request, response) => {
  const path = normalize(
    decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname),
  );
  let file = join(root, path);
  if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) {
    // Unknown API paths must not be answered with the app shell.
    if (path.startsWith('/api/')) {
      response.writeHead(404).end();
      return;
    }
    file = join(root, 'index.html');
  }

  const extension = extname(file);
  const headers = {
    'Content-Type': types[extension] ?? 'application/octet-stream',
    'Cache-Control': 'no-cache',
  };
  const stream = createReadStream(file);
  if (compressible.has(extension) && /\bgzip\b/.test(request.headers['accept-encoding'] ?? '')) {
    response.writeHead(200, {
      ...headers,
      'Content-Encoding': 'gzip',
      Vary: 'Accept-Encoding',
    });
    stream.pipe(createGzip()).pipe(response);
  } else {
    response.writeHead(200, headers);
    stream.pipe(response);
  }
}).listen(port, () => console.log(`Serving ${root} on http://localhost:${port}`));
