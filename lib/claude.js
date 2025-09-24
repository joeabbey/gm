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
  const binaryPath = resolveClaudePath();
  if (!binaryPath) {
    return { found: false, version: null, path: null };
  }

  const result = spawnSync('claude', ['--version'], { encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    const stderr = result && typeof result.stderr === 'string' ? result.stderr.trim() : '';
    const firstLine = stderr.split(/\r?\n/).find((line) => line && line.trim()) || null;
    let errorMessage = firstLine || (result.error ? result.error.message : null);
    if (typeof errorMessage === 'string' && errorMessage.length > 200) {
      errorMessage = `${errorMessage.slice(0, 197)}…`;
    }
    return {
      found: true,
      version: null,
      path: binaryPath,
      error: errorMessage
    };
  }

  const stdout = result.stdout ? result.stdout.trim() : '';
  const stderr = result.stderr ? result.stderr.trim() : '';
  const version = extractVersion(stdout || stderr);

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
