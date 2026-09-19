#!/usr/bin/env node
/**
 * Root Proxy for Transaction Validation
 *
 * Delegates to `frontend/scripts/validate-transactions.js`.
 * Enables `node scripts/validate-transactions.js` to execute directly from repository root.
 */

const path = require('path');
const targetScript = path.resolve(__dirname, '../frontend/scripts/validate-transactions.js');
const validator = require(targetScript);

if (typeof validator.runValidationCli === 'function') {
  const result = validator.runValidationCli(process.argv[2]);
  if (result && typeof result.exitCode === 'number') {
    process.exit(result.exitCode);
  }
}
