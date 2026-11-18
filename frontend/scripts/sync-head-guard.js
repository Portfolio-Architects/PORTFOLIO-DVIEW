const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const ts = require('typescript');

const DEFAULT_OUTPUT_JS = path.resolve(__dirname, '../public/js/dview-ga-admin-guard.js');
const DEFAULT_VERSION_TS = path.resolve(__dirname, '../src/lib/head-guard-version.ts');
const CATALOG_TS_PATH = path.resolve(__dirname, '../src/lib/utils/canonicalAptCatalog.ts');
const ADMIN_EXCLUSION_TS_PATH = path.resolve(__dirname, '../src/lib/utils/adminExclusion.ts');

function transpileAndRunTsModule(filePath, customRequire) {
  const source = fs.readFileSync(filePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;

  const mod = { exports: {} };
  const sanitizedEnv = { ...process.env };
  delete sanitizedEnv.NEXT_PUBLIC_GA_ID;

  const sandbox = {
    module: mod,
    exports: mod.exports,
    require: customRequire,
    process: { ...process, env: sanitizedEnv },
    __filename: filePath,
    __dirname: path.dirname(filePath),
    Buffer,
    console,
    URL,
    URLSearchParams,
  };

  vm.runInNewContext(transpiled, sandbox, { filename: filePath });
  return mod.exports;
}

function buildStaticHeadGuardScript() {
  const catalogExports = transpileAndRunTsModule(CATALOG_TS_PATH, require);
  const adminExports = transpileAndRunTsModule(ADMIN_EXCLUSION_TS_PATH, (id) => {
    if (id === './canonicalAptCatalog') {
      return catalogExports;
    }
    return require(id);
  });

  if (typeof adminExports.buildPreHydrationAdminGuardScript !== 'function') {
    throw new Error('[Head Guard Sync] buildPreHydrationAdminGuardScript export를 찾을 수 없습니다.');
  }

  return adminExports.buildPreHydrationAdminGuardScript(adminExports.DEFAULT_GA_MEASUREMENT_ID);
}

function computeHeadGuardVersion(scriptContent) {
  return crypto.createHash('sha256').update(String(scriptContent || ''), 'utf8').digest('hex').slice(0, 12);
}

function syncHeadGuard(options = {}) {
  const checkOnly = Boolean(options.checkOnly);
  const outputJsPath = options.outputJsPath || DEFAULT_OUTPUT_JS;
  const versionTsPath = options.versionTsPath || DEFAULT_VERSION_TS;

  const scriptContent = buildStaticHeadGuardScript();
  const version = computeHeadGuardVersion(scriptContent);
  const expectedVersionTs = `export const HEAD_GUARD_VERSION = '${version}';\n`;

  const jsMatches =
    fs.existsSync(outputJsPath) &&
    fs.readFileSync(outputJsPath, 'utf8') === scriptContent;
  const tsMatches =
    fs.existsSync(versionTsPath) &&
    fs.readFileSync(versionTsPath, 'utf8').replace(/\r\n/g, '\n') === expectedVersionTs;

  const bytes = Buffer.byteLength(scriptContent, 'utf8');

  if (jsMatches && tsMatches) {
    return {
      status: 'in-sync',
      updated: false,
      version,
      bytes,
      outputJsPath,
      versionTsPath,
    };
  }

  if (checkOnly) {
    throw new Error(
      `[Head Guard Sync] 드리프트 감지: ${outputJsPath} 또는 ${versionTsPath}가 최신이 아닙니다. 'node scripts/sync-head-guard.js'를 실행하세요.`
    );
  }

  fs.mkdirSync(path.dirname(outputJsPath), { recursive: true });
  fs.writeFileSync(outputJsPath, scriptContent, 'utf8');

  fs.mkdirSync(path.dirname(versionTsPath), { recursive: true });
  fs.writeFileSync(versionTsPath, expectedVersionTs, 'utf8');

  return {
    status: 'synced',
    updated: true,
    version,
    bytes,
    outputJsPath,
    versionTsPath,
  };
}

if (require.main === module) {
  try {
    const checkOnly = process.argv.includes('--check');
    const result = syncHeadGuard({ checkOnly });
    console.log(
      `[Head Guard Sync] status=${result.status} version=${result.version} bytes=${result.bytes}`
    );
  } catch (err) {
    console.error(err && err.message ? err.message : err);
    process.exit(1);
  }
}

module.exports = {
  syncHeadGuard,
  computeHeadGuardVersion,
  buildStaticHeadGuardScript,
};
