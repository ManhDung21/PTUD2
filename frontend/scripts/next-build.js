#!/usr/bin/env node

// Wraps Next.js build so accidental CLI arguments (e.g. from Vercel) are ignored.
const { spawnSync } = require('child_process');

const result =
  process.platform === 'win32'
    ? spawnSync('cmd', ['/c', 'next', 'build'], { stdio: 'inherit', env: process.env })
    : spawnSync('next', ['build'], { stdio: 'inherit', env: process.env });

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 0);
