'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_CONFIG = path.join(os.homedir(), '.config', 'gm', 'packages.json');
const FALLBACK_CONFIG = path.join(__dirname, '..', 'config', 'packages.json');

function normalizePackageList(list) {
  if (!Array.isArray(list)) {
    return [];
  }
  const seen = new Set();
  const normalized = [];
  for (const entry of list) {
    if (typeof entry !== 'string') {
      continue;
    }
    const trimmed = entry.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    normalized.push(trimmed);
  }
  return normalized;
}

function getConfigPath() {
  const fromEnv = (process.env.GM_CONFIG && process.env.GM_CONFIG.trim()) || '';
  if (fromEnv) {
    return fromEnv;
  }
  return DEFAULT_CONFIG;
}

function loadPackageListCandidates() {
  const candidates = [];
  const fromEnv = (process.env.GM_CONFIG && process.env.GM_CONFIG.trim()) || '';
  if (fromEnv) {
    candidates.push(fromEnv);
  }
  candidates.push(DEFAULT_CONFIG);
  candidates.push(FALLBACK_CONFIG);
  return candidates;
}

function loadPackages() {
  for (const candidate of loadPackageListCandidates()) {
    try {
      if (!fs.existsSync(candidate)) {
        continue;
      }
      const raw = fs.readFileSync(candidate, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return normalizePackageList(parsed);
      }
    } catch (error) {
      // ignore malformed candidates and continue searching
    }
  }
  return [];
}

function loadPackagesForEditing() {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    return { configPath, packages: [...loadPackages()] };
  }
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('packages file must contain a JSON array');
    }
    return { configPath, packages: normalizePackageList(parsed) };
  } catch (error) {
    const wrapped = new Error(`failed to read ${configPath}: ${error.message}`);
    wrapped.code = 'CONFIG_READ_ERROR';
    throw wrapped;
  }
}

function writePackages(configPath, packages) {
  const normalized = normalizePackageList(packages);
  const dir = path.dirname(configPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(configPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
}

module.exports = {
  DEFAULT_CONFIG,
  FALLBACK_CONFIG,
  normalizePackageList,
  getConfigPath,
  loadPackages,
  loadPackagesForEditing,
  writePackages
};
