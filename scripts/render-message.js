#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_CACHE_PATH = process.env.GM_CACHE || path.join(os.homedir(), '.cache', 'gm', 'status.json');

const args = process.argv.slice(2);
const quietWhenNone = args.includes('--quiet-when-none');
const verbose = args.includes('--verbose');
const explicitPath = args.find((value, index) => index === 0 && !value.startsWith('-'));
const cachePath = explicitPath && !explicitPath.startsWith('--') ? explicitPath : DEFAULT_CACHE_PATH;

function readStatus(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

const status = readStatus(cachePath);
if (!status) {
  if (!quietWhenNone) {
    console.log('[gm] status unavailable');
  }
  process.exit(0);
}

const updates = (status.packages || []).filter((pkg) => pkg.status === 'update_available');
const errors = (status.packages || []).filter((pkg) => pkg.status === 'error');
const notInstalled = (status.packages || []).filter((pkg) => pkg.status === 'not_installed');

if (updates.length) {
  const formatted = updates.map((pkg) => {
    const current = pkg.installed || 'none';
    const latest = pkg.latest || 'unknown';
    return `${pkg.name} ${current} → ${latest}`;
  }).join(', ');
  console.log(`[gm] updates available: ${formatted}`);
}

if (!updates.length && errors.length && !quietWhenNone) {
  const message = errors.map((pkg) => `${pkg.name}: ${pkg.error || 'lookup failed'}`).join('; ');
  console.log(`[gm] lookup issue — ${message}`);
}

if (!updates.length && !errors.length && notInstalled.length && verbose) {
  const names = notInstalled.map((pkg) => pkg.name).join(', ');
  console.log(`[gm] not installed: ${names}`);
}

if (!updates.length && !errors.length && !notInstalled.length && !quietWhenNone) {
  console.log('[gm] all set');
}
