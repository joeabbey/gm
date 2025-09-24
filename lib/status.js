'use strict';

const fs = require('fs');

function readStatus(cachePath) {
  try {
    const content = fs.readFileSync(cachePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

function summarizeStatus(status) {
  if (!status) {
    return {
      updates: [],
      errors: [],
      missing: []
    };
  }
  const packages = Array.isArray(status.packages) ? status.packages : [];
  const updates = packages.filter((pkg) => pkg.status === 'update_available');
  const errors = packages.filter((pkg) => pkg.status === 'error');
  const missing = packages.filter((pkg) => pkg.status === 'not_installed');
  return { updates, errors, missing };
}

module.exports = {
  readStatus,
  summarizeStatus
};
