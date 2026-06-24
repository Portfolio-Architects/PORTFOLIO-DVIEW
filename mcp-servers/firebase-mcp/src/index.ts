import { Server } from "@modelcontextprotocol/sdk/server/index.js";
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
        console.error(`Found serviceAccountKey.json at: ${p}`);
        return JSON.parse(fs.readFileSync(p, 'utf8'));
      } catch (err) {
        console.error(`Failed to parse serviceAccountKey.json at ${p}:`, err);
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
        console.error(`Reading credentials from env file at: ${envPath}`);
        const envContent = fs.readFileSync(envPath, 'utf8');
        const lines = envContent.split(/\r?\n/);
        
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
              privateKey = val.replace(/\\n/g, '\n');
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
        console.error(`Failed to read or parse env file at ${envPath}:`, err);
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
        return { content: [{ type: "text", text: `Document ${docPath} not found.` }] };
      }
      
      return {
        content: [{ type: "text", text: JSON.stringify({ id: doc.id, ...doc.data() }, null, 2) }],
      };
    }

    throw new Error(`Unknown tool: ${request.params.name}`);
  } catch (error: any) {
    return {
      content: [{ type: "text", text: `Firebase Error: ${error.message}` }],
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
