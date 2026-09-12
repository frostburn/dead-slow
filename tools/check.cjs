'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { bundle } = require('./build.cjs');
const root = path.resolve(__dirname, '..');
let total = 0;
for (const directory of ['src', 'tools', 'tests']) {
    for (const file of fs.readdirSync(path.join(root, directory))) {
        if (!/\.(?:c?js)$/.test(file))
            continue;
        const result = spawnSync(process.execPath, ['--check', path.join(root, directory, file)], { stdio: 'inherit' });
        if (result.status !== 0)
            process.exit(result.status || 1);
        total++;
    }
}
const a = bundle(), b = bundle();
if (a !== b)
    throw new Error('Build is not deterministic.');
console.log(`${total} JavaScript files parse; the offline build is reproducible.`);
