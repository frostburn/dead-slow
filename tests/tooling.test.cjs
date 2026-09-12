'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { bundle } = require('../tools/build.cjs');
const { createServer } = require('../tools/serve.cjs');
test('single-file build is deterministic and has all eight inlined modules', () => {
    const a = bundle();
    assert.equal(a, bundle());
    assert.equal((a.match(/<script>/g) || []).length, 8);
    assert.equal(/<script[^>]+src=/.test(a), false);
    assert.match(a, /Midsummer Dispatch/);
    assert.match(a, /HarborJobs/);
});
async function request(server, target, method = 'GET') {
    return new Promise((resolve, reject) => {
        const req = http.request({ host: '127.0.0.1', port: server.address().port, path: target, method }, res => {
            let body = '';
            res.setEncoding('utf8');
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
        });
        req.on('error', reject);
        req.end();
    });
}
test('local server serves assets, supports HEAD, and guards private/traversal paths', async (t) => {
    const server = createServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    for (const file of ['/', '/style.css', '/src/jobs.js']) {
        const r = await request(server, file);
        assert.equal(r.status, 200, file);
        assert.equal(r.headers['cache-control'], 'no-store');
        assert.ok(r.body.length);
    }
    const head = await request(server, '/');
    const onlyHead = await request(server, '/', 'HEAD');
    assert.equal(onlyHead.status, 200);
    assert.equal(onlyHead.body, '');
    assert.equal(onlyHead.headers['content-length'], head.headers['content-length']);
    assert.equal((await request(server, '/absent.html')).status, 404);
    assert.equal((await request(server, '/', 'POST')).status, 405);
    assert.equal((await request(server, '/%ff')).status, 400);
    assert.equal((await request(server, '/%00')).status, 400);
    assert.equal((await request(server, '/.git/config')).status, 403);
    assert.equal((await request(server, '/%2e%2e/index.html')).status, 403);
    assert.equal((await request(server, '/src/../index.html')).status, 403);
});
