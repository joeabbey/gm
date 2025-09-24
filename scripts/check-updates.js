#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const DEFAULT_CACHE_PATH = process.env.GM_CACHE || path.join(os.homedir(), '.cache', 'gm', 'status.json');
const configCandidates = [];
if (process.env.GM_CONFIG && process.env.GM_CONFIG.trim()) {
  configCandidates.push(process.env.GM_CONFIG.trim());
}
configCandidates.push(path.join(os.homedir(), '.config', 'gm', 'packages.json'));
configCandidates.push(path.join(__dirname, '..', 'config', 'packages.json'));

function readJson(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

function loadPackageList() {
  for (const candidate of configCandidates) {
    const data = readJson(candidate);
    if (Array.isArray(data) && data.length) {
      return data;
    }
  }
  return [];
}

function runNpm(args) {
  const result = spawnSync('npm', args, { encoding: 'utf8' });
  if (result.error) {
    const err = new Error(`Failed to run npm ${args.join(' ')}: ${result.error.message}`);
    err.original = result.error;
    throw err;
  }
  result.stdout = result.stdout || '';
  result.stderr = result.stderr || '';
  return result;
}

function parseInstalledVersions() {
  try {
    const { status, stdout } = runNpm(['ls', '-g', '--depth', '0', '--json']);
    if (status !== 0 || typeof stdout !== 'string' || !stdout.trim()) {
      return {};
    }
    const data = JSON.parse(stdout);
    return data.dependencies || {};
  } catch (error) {
    return {};
  }
}

function getLatestVersion(pkg) {
  try {
    const result = runNpm(['view', pkg, 'version', '--json']);
    if (result.status !== 0) {
      throw new Error(result.stderr.trim() || `npm view exited with code ${result.status}`);
    }
    const value = result.stdout.trim();
    if (!value) {
      return null;
    }
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed[parsed.length - 1] || null;
    }
    return parsed;
  } catch (error) {
    return { error: error.message };
  }
}

function collectStatus(packages) {
  const installed = parseInstalledVersions();
  const statuses = packages.map((pkg) => {
    const info = {
      name: pkg,
      installed: null,
      latest: null,
      status: 'unknown',
      error: null
    };

    const installedEntry = installed[pkg];
    if (installedEntry && typeof installedEntry.version === 'string') {
      info.installed = installedEntry.version;
    }

    const latest = getLatestVersion(pkg);
    if (latest && typeof latest === 'object' && latest.error) {
      info.error = latest.error;
    } else {
      info.latest = latest;
    }

    if (info.error) {
      info.status = 'error';
    } else if (!info.installed) {
      info.status = info.latest ? 'not_installed' : 'unknown';
    } else if (!info.latest) {
      info.status = 'unknown';
    } else if (info.installed === info.latest) {
      info.status = 'up_to_date';
    } else {
      info.status = 'update_available';
    }

    return info;
  });

  return {
    generatedAt: new Date().toISOString(),
    packages: statuses,
    summary: {
      total: statuses.length,
      updatesAvailable: statuses.filter((pkg) => pkg.status === 'update_available').length,
      notInstalled: statuses.filter((pkg) => pkg.status === 'not_installed').length,
      errors: statuses.filter((pkg) => pkg.status === 'error').length
    }
  };
}

function writeStatusFile(targetPath, payload) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, JSON.stringify(payload, null, 2));
}

function main() {
  const packages = loadPackageList();
  if (!packages.length) {
    console.error('gm: no packages configured. Create ~/.config/gm/packages.json or set GM_CONFIG.');
    process.exitCode = 1;
    return;
  }

  let payload;
  try {
    payload = collectStatus(packages);
  } catch (error) {
    const message = error && error.message ? error.message : 'Unknown error while collecting status';
    payload = {
      generatedAt: new Date().toISOString(),
      packages: [],
      summary: {
        total: 0,
        updatesAvailable: 0,
        notInstalled: 0,
        errors: 1
      },
      error: message
    };
    process.exitCode = 1;
  }

  writeStatusFile(DEFAULT_CACHE_PATH, payload);

  const updates = payload.packages.filter((pkg) => pkg.status === 'update_available');
  if (payload.error) {
    console.error(payload.error);
  }
  if (updates.length) {
    console.log(`Updates available for: ${updates.map((pkg) => pkg.name).join(', ')}`);
  } else {
    console.log('No updates available.');
  }
}

main();
