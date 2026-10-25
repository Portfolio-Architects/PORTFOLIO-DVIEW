const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MCP_DIR = path.join(__dirname, 'mcp-servers', 'ga4-mcp');

console.log('[1/3] Verifying GA4 MCP Server directory structure...');
if (!fs.existsSync(MCP_DIR)) {
  throw new Error('Directory not found: ' + MCP_DIR);
}

console.log('[2/3] Installing npm dependencies in mcp-servers/ga4-mcp...');
execSync('npm install --no-audit --no-fund', { cwd: MCP_DIR, stdio: 'inherit' });

console.log('[3/3] Compiling TypeScript to mcp-servers/ga4-mcp/build/index.js...');
execSync('npm run build', { cwd: MCP_DIR, stdio: 'inherit' });

const builtEntry = path.join(MCP_DIR, 'build', 'index.js');
if (!fs.existsSync(builtEntry)) {
  throw new Error('Build artifact missing: ' + builtEntry);
}

console.log('GA4 MCP Server build completed at: ' + builtEntry);
