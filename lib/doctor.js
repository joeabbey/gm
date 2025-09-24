'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function checkNodeVersion(minMajor = 16) {
  const version = process.versions && process.versions.node ? process.versions.node : 'unknown';
  let ok = false;
  if (version !== 'unknown') {
    const major = Number.parseInt(version.split('.')[0], 10);
    ok = Number.isInteger(major) && major >= minMajor;
  }
  return {
    name: 'Node.js version',
    status: ok ? 'ok' : 'warn',
    detail: ok ? `node ${version}` : `node ${version} (expected >= ${minMajor})`
  };
}

function checkNpmAvailable() {
  const result = spawnSync('npm', ['--version'], { stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.error) {
    return {
      name: 'npm availability',
      status: 'error',
      detail: result.error.message
    };
  }
  if (result.status !== 0) {
    const stderr = (result.stderr && result.stderr.toString().trim()) || 'npm returned a non-zero exit code';
    return {
      name: 'npm availability',
      status: 'error',
      detail: stderr
    };
  }
  const version = result.stdout ? result.stdout.toString().trim() : 'unknown';
  return {
    name: 'npm availability',
    status: 'ok',
    detail: `npm ${version}`
  };
}

function checkPathWritable(targetPath) {
  try {
    const dir = path.dirname(targetPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    return {
      name: 'Cache directory',
      status: 'ok',
      detail: dir
    };
  } catch (error) {
    return {
      name: 'Cache directory',
      status: 'warn',
      detail: error.message
    };
  }
}

function checkConfigFile(configPath) {
  if (!configPath) {
    return {
      name: 'Config file',
      status: 'warn',
      detail: 'No config path resolved'
    };
  }
  if (!fs.existsSync(configPath)) {
    return {
      name: 'Config file',
      status: 'info',
      detail: `${configPath} (will be created when needed)`
    };
  }
  try {
    fs.accessSync(configPath, fs.constants.R_OK | fs.constants.W_OK);
    return {
      name: 'Config file',
      status: 'ok',
      detail: configPath
    };
  } catch (error) {
    return {
      name: 'Config file',
      status: 'warn',
      detail: `${configPath} (${error.message})`
    };
  }
}

function runDoctor({ cachePath, configPath }) {
  const checks = [];
  checks.push(checkNodeVersion());
  checks.push(checkNpmAvailable());
  checks.push(checkPathWritable(cachePath));
  checks.push(checkConfigFile(configPath));
  return checks;
}

module.exports = {
  runDoctor
};
