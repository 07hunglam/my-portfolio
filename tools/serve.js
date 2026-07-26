// Local preview server that matches how Vercel serves this site statically:
// clean URLs, index.html for directories, and 404.html with a real 404 status
// for anything unmatched. `python -m http.server` does none of that, which
// hides bugs that only appear on a missing route - relative asset paths in
// 404.html being the obvious one.
//
// Run:  node tools/serve.js [port]
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.argv[2]) || 5000;

const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.xml': 'application/xml; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.cpp': 'text/plain; charset=utf-8'
};

function contentType(file) {
    return TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

// Resolve inside ROOT only - a request for ../../etc/passwd must not escape
function resolveSafe(pathname) {
    const decoded = decodeURIComponent(pathname);
    const target = path.join(ROOT, path.normalize(decoded));
    const rel = path.relative(ROOT, target);
    if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
    return target;
}

function candidates(target) {
    return [target, target + '.html', path.join(target, 'index.html')];
}

const server = http.createServer((req, res) => {
    const pathname = url.parse(req.url).pathname;
    const target = resolveSafe(pathname);

    let file = null;
    if (target) {
        for (const c of candidates(target)) {
            if (fs.existsSync(c) && fs.statSync(c).isFile()) { file = c; break; }
        }
    }

    if (file) {
        res.writeHead(200, { 'Content-Type': contentType(file), 'Cache-Control': 'no-store' });
        fs.createReadStream(file).pipe(res);
        console.log(`200 ${pathname}`);
        return;
    }

    const notFound = path.join(ROOT, '404.html');
    const body = fs.existsSync(notFound) ? fs.readFileSync(notFound) : 'Not Found';
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(body);
    console.log(`404 ${pathname}`);
});

server.listen(PORT, () => {
    console.log(`serving ${ROOT} on http://localhost:${PORT}`);
});
