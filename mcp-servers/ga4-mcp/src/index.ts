import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { GoogleAuth } from "google-auth-library";
import * as fs from "fs";
import * as path from "path";
import { z } from "zod";

// ============================================================================
// 1. Runtime Schemas & Types (HODEP v2.2 Rule 8: Zero Unchecked Casts)
// ============================================================================

export const GaCredentialsSchema = z.object({
  clientEmail: z.string().email(),
  privateKey: z.string().min(50),
  propertyId: z.string().regex(/^\d+$/),
  measurementId: z.string().optional(),
  projectId: z.string().optional(),
});

export type GaCredentials = z.infer<typeof GaCredentialsSchema>;

export const FaultVectorSchema = z.object({
  faultVector: z.tuple([z.string(), z.string(), z.string()]),
  recoveryInvariant: z.string(),
  details: z.record(z.string(), z.string()).optional(),
});

export type FaultVector = z.infer<typeof FaultVectorSchema>;

export const Ga4RunReportInputSchema = z.object({
  propertyId: z.string().regex(/^\d+$/).optional(),
  startDate: z.string().min(1).default("30daysAgo"),
  endDate: z.string().min(1).default("today"),
  dimensions: z.array(z.string().min(1)).default(["date"]),
  metrics: z
    .array(z.string().min(1))
    .default([
      "activeUsers",
      "screenPageViews",
      "sessions",
      "averageSessionDuration",
    ]),
  dimensionFilterField: z.string().optional(),
  dimensionFilterValue: z.string().optional(),
  orderByMetric: z.string().optional(),
  orderDesc: z.boolean().default(true),
  limit: z.number().int().min(1).max(1000).default(100),
});

export const Ga4RunRealtimeReportInputSchema = z.object({
  propertyId: z.string().regex(/^\d+$/).optional(),
  dimensions: z.array(z.string().min(1)).default(["unifiedScreenName"]),
  metrics: z
    .array(z.string().min(1))
    .default(["activeUsers", "screenPageViews"]),
  limit: z.number().int().min(1).max(200).default(50),
});

export const Ga4GetMetadataInputSchema = z.object({
  propertyId: z.string().regex(/^\d+$/).optional(),
  searchQuery: z.string().optional(),
  includeDimensions: z.boolean().default(true),
  includeMetrics: z.boolean().default(true),
  customOnly: z.boolean().default(false),
  limit: z.number().int().min(1).max(500).default(100),
});

export const Ga4DviewFunnelInputSchema = z.object({
  propertyId: z.string().regex(/^\d+$/).optional(),
  startDate: z.string().min(1).default("30daysAgo"),
  endDate: z.string().min(1).default("today"),
  topPagesLimit: z.number().int().min(1).max(100).default(20),
});

export const Ga4AdminInfoInputSchema = z.object({
  propertyId: z.string().regex(/^\d+$/).optional(),
});

// ============================================================================
// 2. Deterministic Credential Loader
// ============================================================================

/**
 * Resolves GA4 Service Account credentials and default Property ID from process.env
 * or workspace `.env.local` files without requiring external JSON key files.
 * Complexity: Time O(L) where L is line count of .env.local, Space O(L), Side-effects: True (FS Read).
 */
export function loadGaCredentials(): GaCredentials | null {
  const envCandidates: Record<string, string> = {};

  const envFilePaths = [
    path.resolve(__dirname, "../../../frontend/.env.local"),
    path.resolve(process.cwd(), "frontend/.env.local"),
    path.resolve(process.cwd(), ".env.local"),
  ];

  for (const envPath of envFilePaths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, "utf8");
        const lines = content.split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const eqIdx = trimmed.indexOf("=");
          if (eqIdx <= 0) continue;
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          if (!envCandidates[key]) {
            envCandidates[key] = val;
          }
        }
      } catch {
        // Continue to next candidate path
      }
    }
  }

  const rawEmail =
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    envCandidates["GOOGLE_SERVICE_ACCOUNT_EMAIL"] ||
    "";
  const rawKey =
    process.env.GOOGLE_PRIVATE_KEY ||
    envCandidates["GOOGLE_PRIVATE_KEY"] ||
    "";
  const rawPropertyId =
    process.env.GA_PROPERTY_ID ||
    envCandidates["GA_PROPERTY_ID"] ||
    "527874632";
  const rawMeasurementId =
    process.env.NEXT_PUBLIC_GA_ID || envCandidates["NEXT_PUBLIC_GA_ID"];
  const rawProjectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    envCandidates["NEXT_PUBLIC_FIREBASE_PROJECT_ID"];

  const formattedKey = rawKey.replace(/\\n/g, "\n").replace(/"/g, "");

  const parsed = GaCredentialsSchema.safeParse({
    clientEmail: rawEmail,
    privateKey: formattedKey,
    propertyId: rawPropertyId,
    measurementId: rawMeasurementId,
    projectId: rawProjectId,
  });

  if (parsed.success) {
    return parsed.data;
  }
  return null;
}

const cachedCredentials = loadGaCredentials();

const analyticsDataClient = cachedCredentials
  ? new BetaAnalyticsDataClient({
      credentials: {
        client_email: cachedCredentials.clientEmail,
        private_key: cachedCredentials.privateKey,
      },
    })
  : null;

/**
 * Formats a report response into a deterministic array of key-value records.
 * Complexity: Time O(N * M) where N = rows, M = dimensions + metrics; Space O(N * M); Side-effects: False.
 */
function normalizeReportRows(
  dimensionHeaders: { name?: string | null }[] | null | undefined,
  metricHeaders: { name?: string | null }[] | null | undefined,
  rows:
    | {
        dimensionValues?: { value?: string | null }[] | null;
        metricValues?: { value?: string | null }[] | null;
      }[]
    | null
    | undefined
): Record<string, string | number>[] {
  const dimNames = (dimensionHeaders || []).map(
    (h, idx) => h.name || `dimension_${idx}`
  );
  const metNames = (metricHeaders || []).map(
    (h, idx) => h.name || `metric_${idx}`
  );

  return (rows || []).map((row) => {
    const record: Record<string, string | number> = {};
    (row.dimensionValues || []).forEach((dv, idx) => {
      const key = dimNames[idx] || `dimension_${idx}`;
      record[key] = dv.value ?? "";
    });
    (row.metricValues || []).forEach((mv, idx) => {
      const key = metNames[idx] || `metric_${idx}`;
      const rawVal = mv.value ?? "0";
      const numVal = Number(rawVal);
      record[key] = Number.isNaN(numVal) ? rawVal : numVal;
    });
    return record;
  });
}

function buildFaultResponse(fault: FaultVector, isError: boolean = true) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(fault, null, 2),
      },
    ],
    isError,
  };
}

// ============================================================================
// 3. MCP Server Registration & Tool Handlers
// ============================================================================

const server = new Server(
  {
    name: "google-analytics",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "ga4_run_report",
        description:
          "Run a custom Google Analytics 4 (GA4) Data API report for the specified date range, dimensions, and metrics. Defaults to DVIEW property 527874632.",
        inputSchema: {
          type: "object",
          properties: {
            propertyId: {
              type: "string",
              description: "GA4 Property ID (defaults to 527874632)",
            },
            startDate: {
              type: "string",
              description: "Start date (YYYY-MM-DD, '7daysAgo', '30daysAgo', etc.)",
            },
            endDate: {
              type: "string",
              description: "End date (YYYY-MM-DD, 'today', 'yesterday')",
            },
            dimensions: {
              type: "array",
              items: { type: "string" },
              description: "GA4 dimension names (e.g. ['date', 'pagePath', 'eventName'])",
            },
            metrics: {
              type: "array",
              items: { type: "string" },
              description:
                "GA4 metric names (e.g. ['activeUsers', 'screenPageViews', 'sessions', 'eventCount'])",
            },
            dimensionFilterField: {
              type: "string",
              description: "Optional dimension name to filter by exact match",
            },
            dimensionFilterValue: {
              type: "string",
              description: "Optional exact string value for dimensionFilterField",
            },
            orderByMetric: {
              type: "string",
              description: "Optional metric name to sort rows by",
            },
            orderDesc: {
              type: "boolean",
              description: "Sort descending when orderByMetric is set (default: true)",
            },
            limit: {
              type: "number",
              description: "Max rows to return (1..1000, default: 100)",
            },
          },
        },
      },
      {
        name: "ga4_run_realtime_report",
        description:
          "Run a Google Analytics 4 (GA4) Realtime report showing active users, screen views, and events over the last 30 minutes.",
        inputSchema: {
          type: "object",
          properties: {
            propertyId: {
              type: "string",
              description: "GA4 Property ID (defaults to 527874632)",
            },
            dimensions: {
              type: "array",
              items: { type: "string" },
              description:
                "Realtime dimensions (e.g. ['unifiedScreenName', 'eventName', 'country', 'deviceCategory'])",
            },
            metrics: {
              type: "array",
              items: { type: "string" },
              description:
                "Realtime metrics (e.g. ['activeUsers', 'screenPageViews', 'eventCount'])",
            },
            limit: {
              type: "number",
              description: "Max rows to return (1..200, default: 50)",
            },
          },
        },
      },
      {
        name: "ga4_get_metadata",
        description:
          "Retrieve available GA4 dimensions and metrics metadata for the property, including custom definitions.",
        inputSchema: {
          type: "object",
          properties: {
            propertyId: {
              type: "string",
              description: "GA4 Property ID (defaults to 527874632)",
            },
            searchQuery: {
              type: "string",
              description:
                "Optional keyword filter on apiName, uiName, description, or category",
            },
            includeDimensions: {
              type: "boolean",
              description: "Include dimensions in output (default: true)",
            },
            includeMetrics: {
              type: "boolean",
              description: "Include metrics in output (default: true)",
            },
            customOnly: {
              type: "boolean",
              description: "Return only custom dimensions/metrics (default: false)",
            },
            limit: {
              type: "number",
              description: "Max items per category (1..500, default: 100)",
            },
          },
        },
      },
      {
        name: "ga4_get_dview_funnel_telemetry",
        description:
          "Fetch a comprehensive DVIEW KPI & Telemetry report combining overall KPIs (MAU/DAU, sessions, views, engagement), daily trend, top pages, and custom event counts (page_view, ad_telemetry, apartment search/view).",
        inputSchema: {
          type: "object",
          properties: {
            propertyId: {
              type: "string",
              description: "GA4 Property ID (defaults to 527874632)",
            },
            startDate: {
              type: "string",
              description: "Start date (default: '30daysAgo')",
            },
            endDate: {
              type: "string",
              description: "End date (default: 'today')",
            },
            topPagesLimit: {
              type: "number",
              description: "Max top pages to return (default: 20)",
            },
          },
        },
      },
      {
        name: "ga4_get_property_admin_info",
        description:
          "Query Google Analytics Admin API v1beta for property configuration and web data streams (requires analyticsadmin.googleapis.com enabled in GCP).",
        inputSchema: {
          type: "object",
          properties: {
            propertyId: {
              type: "string",
              description: "GA4 Property ID (defaults to 527874632)",
            },
          },
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (!cachedCredentials || !analyticsDataClient) {
    return buildFaultResponse({
      faultVector: [
        "ERR_GA4_CREDENTIALS_MISSING",
        "loadGaCredentials",
        "NULL_CREDENTIALS",
      ],
      recoveryInvariant:
        "Ensure GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and GA_PROPERTY_ID exist in frontend/.env.local.",
    });
  }

  const toolName = request.params.name;
  const rawArgs = request.params.arguments ?? {};

  try {
    // ------------------------------------------------------------------------
    // Tool 1: ga4_run_report
    // ------------------------------------------------------------------------
    if (toolName === "ga4_run_report") {
      const parsed = Ga4RunReportInputSchema.safeParse(rawArgs);
      if (!parsed.success) {
        return buildFaultResponse({
          faultVector: [
            "ERR_ZOD_VALIDATION",
            "ga4_run_report",
            parsed.error.message,
          ],
          recoveryInvariant: "Provide valid report parameters matching schema.",
        });
      }

      const {
        propertyId = cachedCredentials.propertyId,
        startDate,
        endDate,
        dimensions,
        metrics,
        dimensionFilterField,
        dimensionFilterValue,
        orderByMetric,
        orderDesc,
        limit,
      } = parsed.data;

      const [response] = await analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate, endDate }],
        dimensions: dimensions.map((name) => ({ name })),
        metrics: metrics.map((name) => ({ name })),
        dimensionFilter:
          dimensionFilterField && dimensionFilterValue !== undefined
            ? {
                filter: {
                  fieldName: dimensionFilterField,
                  stringFilter: {
                    matchType: "EXACT",
                    value: dimensionFilterValue,
                  },
                },
              }
            : undefined,
        orderBys: orderByMetric
          ? [
              {
                metric: { metricName: orderByMetric },
                desc: orderDesc,
              },
            ]
          : undefined,
        limit,
      });

      const rows = normalizeReportRows(
        response.dimensionHeaders,
        response.metricHeaders,
        response.rows
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                propertyId,
                dateRange: { startDate, endDate },
                rowCount: response.rowCount ?? rows.length,
                rows,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // ------------------------------------------------------------------------
    // Tool 2: ga4_run_realtime_report
    // ------------------------------------------------------------------------
    if (toolName === "ga4_run_realtime_report") {
      const parsed = Ga4RunRealtimeReportInputSchema.safeParse(rawArgs);
      if (!parsed.success) {
        return buildFaultResponse({
          faultVector: [
            "ERR_ZOD_VALIDATION",
            "ga4_run_realtime_report",
            parsed.error.message,
          ],
          recoveryInvariant: "Provide valid realtime report parameters.",
        });
      }

      const {
        propertyId = cachedCredentials.propertyId,
        dimensions,
        metrics,
        limit,
      } = parsed.data;

      const [response] = await analyticsDataClient.runRealtimeReport({
        property: `properties/${propertyId}`,
        dimensions: dimensions.map((name) => ({ name })),
        metrics: metrics.map((name) => ({ name })),
        limit,
      });

      const rows = normalizeReportRows(
        response.dimensionHeaders,
        response.metricHeaders,
        response.rows
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                propertyId,
                window: "last_30_minutes",
                rowCount: response.rowCount ?? rows.length,
                rows,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // ------------------------------------------------------------------------
    // Tool 3: ga4_get_metadata
    // ------------------------------------------------------------------------
    if (toolName === "ga4_get_metadata") {
      const parsed = Ga4GetMetadataInputSchema.safeParse(rawArgs);
      if (!parsed.success) {
        return buildFaultResponse({
          faultVector: [
            "ERR_ZOD_VALIDATION",
            "ga4_get_metadata",
            parsed.error.message,
          ],
          recoveryInvariant: "Provide valid metadata query parameters.",
        });
      }

      const {
        propertyId = cachedCredentials.propertyId,
        searchQuery,
        includeDimensions,
        includeMetrics,
        customOnly,
        limit,
      } = parsed.data;

      const [metadata] = await analyticsDataClient.getMetadata({
        name: `properties/${propertyId}/metadata`,
      });

      const queryLower = searchQuery ? searchQuery.toLowerCase() : "";

      const allDimensions = metadata.dimensions || [];
      const allMetrics = metadata.metrics || [];

      const filteredDimensions = includeDimensions
        ? allDimensions
            .filter((d) => {
              if (customOnly && !d.customDefinition) return false;
              if (!queryLower) return true;
              const haystack = `${d.apiName ?? ""} ${d.uiName ?? ""} ${
                d.description ?? ""
              } ${d.category ?? ""}`.toLowerCase();
              return haystack.includes(queryLower);
            })
            .slice(0, limit)
            .map((d) => ({
              apiName: d.apiName ?? "",
              uiName: d.uiName ?? "",
              category: d.category ?? "",
              customDefinition: Boolean(d.customDefinition),
              description: d.description ?? "",
            }))
        : [];

      const filteredMetrics = includeMetrics
        ? allMetrics
            .filter((m) => {
              if (customOnly && !m.customDefinition) return false;
              if (!queryLower) return true;
              const haystack = `${m.apiName ?? ""} ${m.uiName ?? ""} ${
                m.description ?? ""
              } ${m.category ?? ""}`.toLowerCase();
              return haystack.includes(queryLower);
            })
            .slice(0, limit)
            .map((m) => ({
              apiName: m.apiName ?? "",
              uiName: m.uiName ?? "",
              category: m.category ?? "",
              type: String(m.type ?? ""),
              customDefinition: Boolean(m.customDefinition),
              description: m.description ?? "",
            }))
        : [];

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                propertyId,
                totalAvailableDimensions: allDimensions.length,
                totalAvailableMetrics: allMetrics.length,
                returnedDimensionsCount: filteredDimensions.length,
                returnedMetricsCount: filteredMetrics.length,
                dimensions: filteredDimensions,
                metrics: filteredMetrics,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // ------------------------------------------------------------------------
    // Tool 4: ga4_get_dview_funnel_telemetry
    // ------------------------------------------------------------------------
    if (toolName === "ga4_get_dview_funnel_telemetry") {
      const parsed = Ga4DviewFunnelInputSchema.safeParse(rawArgs);
      if (!parsed.success) {
        return buildFaultResponse({
          faultVector: [
            "ERR_ZOD_VALIDATION",
            "ga4_get_dview_funnel_telemetry",
            parsed.error.message,
          ],
          recoveryInvariant: "Provide valid funnel query parameters.",
        });
      }

      const {
        propertyId = cachedCredentials.propertyId,
        startDate,
        endDate,
        topPagesLimit,
      } = parsed.data;

      const [overviewRes, dailyRes, pagesRes, eventsRes] = await Promise.all([
        analyticsDataClient.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate, endDate }],
          metrics: [
            { name: "activeUsers" },
            { name: "newUsers" },
            { name: "sessions" },
            { name: "screenPageViews" },
            { name: "averageSessionDuration" },
            { name: "engagementRate" },
            { name: "eventCount" },
          ],
        }),
        analyticsDataClient.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "date" }],
          metrics: [
            { name: "activeUsers" },
            { name: "screenPageViews" },
            { name: "sessions" },
          ],
          orderBys: [{ dimension: { dimensionName: "date" }, desc: false }],
        }),
        analyticsDataClient.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "pagePath" }],
          metrics: [
            { name: "screenPageViews" },
            { name: "activeUsers" },
            { name: "averageSessionDuration" },
          ],
          orderBys: [
            { metric: { metricName: "screenPageViews" }, desc: true },
          ],
          limit: topPagesLimit,
        }),
        analyticsDataClient.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "eventName" }],
          metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
          orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
          limit: 50,
        }),
      ]);

      const overviewRows = normalizeReportRows(
        overviewRes[0].dimensionHeaders,
        overviewRes[0].metricHeaders,
        overviewRes[0].rows
      );
      const dailyTrend = normalizeReportRows(
        dailyRes[0].dimensionHeaders,
        dailyRes[0].metricHeaders,
        dailyRes[0].rows
      );
      const topPages = normalizeReportRows(
        pagesRes[0].dimensionHeaders,
        pagesRes[0].metricHeaders,
        pagesRes[0].rows
      );
      const eventBreakdown = normalizeReportRows(
        eventsRes[0].dimensionHeaders,
        eventsRes[0].metricHeaders,
        eventsRes[0].rows
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                propertyId,
                measurementId: cachedCredentials.measurementId ?? "G-Y17BHJ77W6",
                dateRange: { startDate, endDate },
                overview: overviewRows[0] ?? {
                  activeUsers: 0,
                  newUsers: 0,
                  sessions: 0,
                  screenPageViews: 0,
                  averageSessionDuration: 0,
                  engagementRate: 0,
                  eventCount: 0,
                },
                dailyTrend,
                topPages,
                eventBreakdown,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // ------------------------------------------------------------------------
    // Tool 5: ga4_get_property_admin_info
    // ------------------------------------------------------------------------
    if (toolName === "ga4_get_property_admin_info") {
      const parsed = Ga4AdminInfoInputSchema.safeParse(rawArgs);
      if (!parsed.success) {
        return buildFaultResponse({
          faultVector: [
            "ERR_ZOD_VALIDATION",
            "ga4_get_property_admin_info",
            parsed.error.message,
          ],
          recoveryInvariant: "Provide valid numeric propertyId.",
        });
      }

      const propertyId =
        parsed.data.propertyId ?? cachedCredentials.propertyId;

      const auth = new GoogleAuth({
        credentials: {
          client_email: cachedCredentials.clientEmail,
          private_key: cachedCredentials.privateKey,
        },
        scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
      });

      const client = await auth.getClient();
      const tokenResponse = await client.getAccessToken();
      const accessToken = tokenResponse.token;

      if (!accessToken) {
        return buildFaultResponse({
          faultVector: [
            "ERR_OAUTH_TOKEN_EMPTY",
            "ga4_get_property_admin_info",
            "NO_BEARER_TOKEN",
          ],
          recoveryInvariant: "Verify service account private key validity.",
        });
      }

      const [propRes, streamsRes] = await Promise.all([
        fetch(
          `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        ),
        fetch(
          `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}/dataStreams`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        ),
      ]);

      const JsonPayloadSchema = z.object({}).passthrough();
      const propBodyRaw = JsonPayloadSchema.safeParse(await propRes.json());
      const streamsBodyRaw = JsonPayloadSchema.safeParse(
        await streamsRes.json()
      );
      const propBody = propBodyRaw.success ? propBodyRaw.data : {};
      const streamsBody = streamsBodyRaw.success ? streamsBodyRaw.data : {};

      if (propRes.status === 403) {
        return buildFaultResponse(
          {
            faultVector: [
              "ERR_GA4_ADMIN_API_DISABLED",
              `properties/${propertyId}`,
              "HTTP_403_SERVICE_DISABLED",
            ],
            recoveryInvariant:
              "Enable Google Analytics Admin API in GCP Console if administrative metadata inspection is required. All GA4 Data API reporting tools remain 100% operational.",
            details: {
              activationUrl:
                "https://console.developers.google.com/apis/api/analyticsadmin.googleapis.com/overview?project=388809605487",
              serviceAccount: cachedCredentials.clientEmail,
              propertyId,
            },
          },
          false
        );
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                propertyId,
                property: propBody,
                dataStreams: streamsBody,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    return buildFaultResponse({
      faultVector: ["ERR_UNKNOWN_TOOL", toolName, "METHOD_NOT_FOUND"],
      recoveryInvariant:
        "Invoke one of: ga4_run_report, ga4_run_realtime_report, ga4_get_metadata, ga4_get_dview_funnel_telemetry, ga4_get_property_admin_info.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return buildFaultResponse({
      faultVector: ["ERR_GA4_EXECUTION_FAILURE", toolName, message],
      recoveryInvariant:
        "Verify GA4 metric/dimension names via ga4_get_metadata and check network connectivity.",
    });
  }
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("GA4 MCP server running on stdio");
}

main().catch((error) => {
  console.error("GA4 MCP Server fatal error:", error);
  process.exit(1);
});
