'use strict';

const { spawnSync } = require('child_process');

const CLAUDE_PACKAGE = '@anthropic-ai/claude-code';

function extractVersion(output) {
  if (!output) {
    return null;
  }
  const match = output.match(/\b(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z-.]+)?)\b/);
  return match ? match[1] : output.trim() || null;
}

function resolveClaudePath() {
  const result = spawnSync('which', ['claude'], { encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    return null;
  }
  const value = result.stdout ? result.stdout.trim() : '';
  return value || null;
}

function probeClaudeBinary() {
  const result = spawnSync('claude', ['--version'], { encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    return { found: false, version: null, path: null }; // treat as unavailable
  }
  const stdout = result.stdout ? result.stdout.trim() : '';
  const stderr = result.stderr ? result.stderr.trim() : '';
  const version = extractVersion(stdout || stderr);
  const binaryPath = resolveClaudePath();
  return {
    found: true,
    version: version || null,
    path: binaryPath
  };
}

module.exports = {
  CLAUDE_PACKAGE,
  probeClaudeBinary
};
