const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MCP_DIR = path.join(__dirname, 'mcp-servers', 'firebase-mcp');

console.log('🚀 Starting Firebase MCP Server setup...');

// 1. 디렉토리 생성
if (!fs.existsSync(MCP_DIR)) {
  fs.mkdirSync(MCP_DIR, { recursive: true });
}

// 2. package.json 생성
const packageJson = {
  "name": "firebase-mcp-server",
  "version": "1.0.0",
  "description": "Firebase Admin MCP Server for AI Assistants",
  "main": "build/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node build/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.1",
    "firebase-admin": "^12.1.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
};

fs.writeFileSync(
  path.join(MCP_DIR, 'package.json'),
  JSON.stringify(packageJson, null, 2)
);

// 3. tsconfig.json 생성
const tsconfig = {
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./build",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"]
};

fs.writeFileSync(
  path.join(MCP_DIR, 'tsconfig.json'),
  JSON.stringify(tsconfig, null, 2)
);

// 4. src 디렉토리 및 index.ts 생성
const SRC_DIR = path.join(MCP_DIR, 'src');
if (!fs.existsSync(SRC_DIR)) {
  fs.mkdirSync(SRC_DIR);
}

const indexTsCode = `import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Load Firebase Credentials
function getServiceAccount(): any {
  // 1. Check process.env directly
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch (e) {
      console.error('Failed to parse process.env.FIREBASE_SERVICE_ACCOUNT_JSON:', e);
    }
  }

  // 2. Paths to check for serviceAccountKey.json
  const pathsToCheck = [
    path.resolve(__dirname, '../../../frontend/serviceAccountKey.json'),
    path.resolve(process.cwd(), 'frontend/serviceAccountKey.json'),
    path.resolve(process.cwd(), 'serviceAccountKey.json'),
    path.resolve(__dirname, '../serviceAccountKey.json'),
  ];

  for (const p of pathsToCheck) {
    if (fs.existsSync(p)) {
      try {
        console.error(\`Found serviceAccountKey.json at: \${p}\`);
        return JSON.parse(fs.readFileSync(p, 'utf8'));
      } catch (err) {
        console.error(\`Failed to parse serviceAccountKey.json at \${p}:\`, err);
      }
    }
  }

  // 3. Fallback: Parse frontend/.env.local to find credentials
  const envLocalPaths = [
    path.resolve(__dirname, '../../../frontend/.env.local'),
    path.resolve(process.cwd(), 'frontend/.env.local'),
    path.resolve(process.cwd(), '.env.local'),
  ];

  for (const envPath of envLocalPaths) {
    if (fs.existsSync(envPath)) {
      try {
        console.error(\`Reading credentials from env file at: \${envPath}\`);
        const envContent = fs.readFileSync(envPath, 'utf8');
        const lines = envContent.split(/\\r?\\n/);
        
        let privateKey = '';
        let clientEmail = '';
        let projectId = 'portfolio-dtdls';

        for (const line of lines) {
          const parts = line.split('=');
          if (parts.length >= 2) {
            const key = parts[0].trim();
            let val = parts.slice(1).join('=').trim();
            if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
              val = val.substring(1, val.length - 1);
            }
            
            if (key === 'FIREBASE_SERVICE_ACCOUNT_JSON') {
              try {
                return JSON.parse(val);
              } catch (e) {
                console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_JSON from env file:', e);
              }
            } else if (key === 'FIREBASE_ADMIN_PRIVATE_KEY' || key === 'GOOGLE_PRIVATE_KEY') {
              privateKey = val.replace(/\\\\n/g, '\\n');
            } else if (key === 'FIREBASE_ADMIN_CLIENT_EMAIL' || key === 'GOOGLE_SERVICE_ACCOUNT_EMAIL') {
              clientEmail = val;
            } else if (key === 'NEXT_PUBLIC_FIREBASE_PROJECT_ID') {
              projectId = val;
            }
          }
        }

        if (privateKey && clientEmail) {
          return {
            projectId,
            clientEmail,
            privateKey,
          };
        }
      } catch (err) {
        console.error(\`Failed to read or parse env file at \${envPath}:\`, err);
      }
    }
  }

  return null;
}

let isFirebaseReady = false;
const serviceAccount = getServiceAccount();

if (serviceAccount) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    isFirebaseReady = true;
    console.error('✅ Firebase Admin initialized successfully.');
  } catch (err) {
    console.error('❌ Failed to initialize Firebase Admin:', err);
  }
} else {
  console.error('❌ Failed to locate Firebase Admin credentials in serviceAccountKey.json or .env.local.');
}

const db = isFirebaseReady ? admin.firestore() : null;

const server = new Server(
  {
    name: "firebase-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool Registration
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "firebase_query",
        description: "Query documents from a Firestore collection. Requires collectionName. Optional: limit.",
        inputSchema: {
          type: "object",
          properties: {
            collectionName: { type: "string" },
            limit: { type: "number", description: "Default is 10" },
          },
          required: ["collectionName"],
        },
      },
      {
        name: "firebase_get_doc",
        description: "Get a specific document by its path (e.g., collection/docId).",
        inputSchema: {
          type: "object",
          properties: {
            docPath: { type: "string", description: "e.g., 'users/user123'" },
          },
          required: ["docPath"],
        },
      }
    ],
  };
});

// Tool Execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (!db) {
    return {
      content: [{ type: "text", text: "Firebase is not initialized. Check serviceAccountKey.json." }],
      isError: true,
    };
  }

  try {
    if (request.params.name === "firebase_query") {
      const { collectionName, limit = 10 } = request.params.arguments as any;
      const snapshot = await db.collection(collectionName).limit(limit).get();
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      return {
        content: [{ type: "text", text: JSON.stringify(docs, null, 2) }],
      };
    }

    if (request.params.name === "firebase_get_doc") {
      const { docPath } = request.params.arguments as any;
      const doc = await db.doc(docPath).get();
      
      if (!doc.exists) {
        return { content: [{ type: "text", text: \`Document \${docPath} not found.\` }] };
      }
      
      return {
        content: [{ type: "text", text: JSON.stringify({ id: doc.id, ...doc.data() }, null, 2) }],
      };
    }

    throw new Error(\`Unknown tool: \${request.params.name}\`);
  } catch (error: any) {
    return {
      content: [{ type: "text", text: \`Firebase Error: \${error.message}\` }],
      isError: true,
    };
  }
});

// Start Server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Firebase MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
`;

fs.writeFileSync(path.join(SRC_DIR, 'index.ts'), indexTsCode);

// 5. 패키지 설치 및 빌드
console.log('📦 Installing dependencies...');
try {
  execSync('npm install', { cwd: MCP_DIR, stdio: 'inherit' });
  console.log('🔨 Building TypeScript project...');
  execSync('npm run build', { cwd: MCP_DIR, stdio: 'inherit' });
  console.log('✅ Firebase MCP Server is ready!');
  console.log('\\n--------------------------------------------------');
  console.log('📌 [Cursor 연동 방법]');
  console.log('1. Cursor Settings > Features > MCP 서버 탭 이동');
  console.log('2. [+ Add new MCP server] 클릭');
  console.log('3. Name: firebase-mcp');
  console.log('   Type: command');
  console.log('   Command: node');
  console.log('   Args: ' + path.join(MCP_DIR, 'build', 'index.js'));
  console.log('4. [Save] 후 서버 연결 상태 초록불 확인');
  console.log('--------------------------------------------------\\n');
} catch (e) {
  console.error('❌ Failed during install or build:', e.message);
}
