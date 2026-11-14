"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ga4HttpError = exports.DVIEW_AD_TELEMETRY_CUSTOM_METRICS = exports.DVIEW_INTERACTION_CUSTOM_DIMENSIONS = exports.DVIEW_AD_TELEMETRY_CUSTOM_DIMENSIONS = exports.Ga4AdTelemetryReportInputSchema = exports.Ga4SyncCustomDimensionsInputSchema = exports.Ga4AdminInfoInputSchema = exports.Ga4DviewFunnelInputSchema = exports.Ga4GetMetadataInputSchema = exports.Ga4RunRealtimeReportInputSchema = exports.Ga4RunReportInputSchema = exports.FaultVectorSchema = exports.GaCredentialsSchema = void 0;
exports.loadGaCredentials = loadGaCredentials;
exports.ipv4HttpsRequest = ipv4HttpsRequest;
exports.getGa4AccessToken = getGa4AccessToken;
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const crypto = __importStar(require("crypto"));
const dns = __importStar(require("dns"));
const fs = __importStar(require("fs"));
const https = __importStar(require("https"));
const path = __importStar(require("path"));
const zlib = __importStar(require("zlib"));
const zod_1 = require("zod");
dns.setDefaultResultOrder("ipv4first");
// ============================================================================
// 1. Runtime Schemas & Types (HODEP v2.2 Rule 8: Zero Unchecked Casts)
// ============================================================================
exports.GaCredentialsSchema = zod_1.z.object({
    clientEmail: zod_1.z.string().email(),
    privateKey: zod_1.z.string().min(50),
    propertyId: zod_1.z.string().regex(/^\d+$/),
    measurementId: zod_1.z.string().optional(),
    projectId: zod_1.z.string().optional(),
});
exports.FaultVectorSchema = zod_1.z.object({
    faultVector: zod_1.z.tuple([zod_1.z.string(), zod_1.z.string(), zod_1.z.string()]),
    recoveryInvariant: zod_1.z.string(),
    details: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
});
exports.Ga4RunReportInputSchema = zod_1.z.object({
    propertyId: zod_1.z.string().regex(/^\d+$/).optional(),
    startDate: zod_1.z.string().min(1).default("30daysAgo"),
    endDate: zod_1.z.string().min(1).default("today"),
    dimensions: zod_1.z.array(zod_1.z.string().min(1)).default(["date"]),
    metrics: zod_1.z
        .array(zod_1.z.string().min(1))
        .default([
        "activeUsers",
        "screenPageViews",
        "sessions",
        "averageSessionDuration",
    ]),
    dimensionFilterField: zod_1.z.string().optional(),
    dimensionFilterValue: zod_1.z.string().optional(),
    orderByMetric: zod_1.z.string().optional(),
    orderDesc: zod_1.z.boolean().default(true),
    limit: zod_1.z.number().int().min(1).max(1000).default(100),
});
exports.Ga4RunRealtimeReportInputSchema = zod_1.z.object({
    propertyId: zod_1.z.string().regex(/^\d+$/).optional(),
    dimensions: zod_1.z.array(zod_1.z.string().min(1)).default(["unifiedScreenName"]),
    metrics: zod_1.z
        .array(zod_1.z.string().min(1))
        .default(["activeUsers", "screenPageViews"]),
    limit: zod_1.z.number().int().min(1).max(200).default(50),
});
exports.Ga4GetMetadataInputSchema = zod_1.z.object({
    propertyId: zod_1.z.string().regex(/^\d+$/).optional(),
    searchQuery: zod_1.z.string().optional(),
    includeDimensions: zod_1.z.boolean().default(true),
    includeMetrics: zod_1.z.boolean().default(true),
    customOnly: zod_1.z.boolean().default(false),
    limit: zod_1.z.number().int().min(1).max(500).default(100),
});
exports.Ga4DviewFunnelInputSchema = zod_1.z.object({
    propertyId: zod_1.z.string().regex(/^\d+$/).optional(),
    startDate: zod_1.z.string().min(1).default("30daysAgo"),
    endDate: zod_1.z.string().min(1).default("today"),
    topPagesLimit: zod_1.z.number().int().min(1).max(100).default(20),
});
exports.Ga4AdminInfoInputSchema = zod_1.z.object({
    propertyId: zod_1.z.string().regex(/^\d+$/).optional(),
});
exports.Ga4SyncCustomDimensionsInputSchema = zod_1.z.object({
    propertyId: zod_1.z.string().regex(/^\d+$/).optional(),
    dryRun: zod_1.z.boolean().default(false),
    includeExtendedDimensions: zod_1.z.boolean().default(true),
    includeInteractionDimensions: zod_1.z.boolean().default(true),
    includeMetrics: zod_1.z.boolean().default(true),
});
exports.Ga4AdTelemetryReportInputSchema = zod_1.z.object({
    propertyId: zod_1.z.string().regex(/^\d+$/).optional(),
    startDate: zod_1.z.string().min(1).default("30daysAgo"),
    endDate: zod_1.z.string().min(1).default("today"),
    limit: zod_1.z.number().int().min(1).max(1000).default(250),
});
exports.DVIEW_AD_TELEMETRY_CUSTOM_DIMENSIONS = [
    {
        parameterName: "slot_id",
        apiName: "customEvent:slot_id",
        displayName: "Ad Slot ID",
        description: "AdSense ad unit ID or D-VIEW ad slot identifier for ad_telemetry",
        scope: "EVENT",
        requiredCore: true,
    },
    {
        parameterName: "event_type",
        apiName: "customEvent:event_type",
        displayName: "Ad Telemetry Event Type",
        description: "Ad slot lifecycle event (VIEWABLE_IMPRESSION, IMPRESSION, UNFILLED, ADBLOCK_FALLBACK, FALLBACK_CLICK, CLICK, GUIDE_PREVIEW_CLICK)",
        scope: "EVENT",
        requiredCore: true,
    },
    {
        parameterName: "apartment_name",
        apiName: "customEvent:apartment_name",
        displayName: "Apartment Name",
        description: "Target Dongtan apartment complex name or GLOBAL route context",
        scope: "EVENT",
        requiredCore: true,
    },
    {
        parameterName: "user_agent_category",
        apiName: "customEvent:user_agent_category",
        displayName: "User Agent Category",
        description: "Client browser environment category (DESKTOP, MOBILE_WEB, IN_APP_BROWSER)",
        scope: "EVENT",
        requiredCore: true,
    },
    {
        parameterName: "placement_slot_id",
        apiName: "customEvent:placement_slot_id",
        displayName: "Ad Placement Slot Key",
        description: "Distinct page placement / refresh observer key (e.g. article_mid, bottom_banner)",
        scope: "EVENT",
        requiredCore: false,
    },
    {
        parameterName: "cpa_campaign_id",
        apiName: "customEvent:cpa_campaign_id",
        displayName: "CPA Campaign ID",
        description: "Native CPA fallback campaign identifier when unfilled or ad-blocked",
        scope: "EVENT",
        requiredCore: false,
        legacyApiNames: ["customEvent:campaign_id"],
    },
    {
        parameterName: "dong",
        apiName: "customEvent:dong",
        displayName: "Legal Dong",
        description: "Hwaseong Dongtan legal or administrative dong context",
        scope: "EVENT",
        requiredCore: false,
    },
];
exports.DVIEW_INTERACTION_CUSTOM_DIMENSIONS = [
    {
        parameterName: "search_term",
        apiName: "customEvent:search_term",
        displayName: "DVIEW Search Term",
        description: "Normalized user search term (<=100 chars) for search_query and view_search_results",
        scope: "EVENT",
        requiredCore: false,
        builtInApiName: "searchTerm",
    },
    {
        parameterName: "surface",
        apiName: "customEvent:surface",
        displayName: "Interaction Surface",
        description: "Originating UI surface for apartment_view or search_query",
        scope: "EVENT",
        requiredCore: false,
    },
    {
        parameterName: "view_type",
        apiName: "customEvent:view_type",
        displayName: "Apartment View Type",
        description: "Presentation mode for apartment_view (modal, detail_page, chart_preview, mobile_drawer, shortcut)",
        scope: "EVENT",
        requiredCore: false,
    },
    {
        parameterName: "trigger",
        apiName: "customEvent:trigger",
        displayName: "Interaction Trigger",
        description: "Specific user gesture or entry trigger for apartment_view or search_query",
        scope: "EVENT",
        requiredCore: false,
    },
    {
        parameterName: "chapter_id",
        apiName: "customEvent:chapter_id",
        displayName: "Modal Chapter ID",
        description: "Selected chapter/tab identifier inside ApartmentModal",
        scope: "EVENT",
        requiredCore: false,
    },
    {
        parameterName: "selected_apt",
        apiName: "customEvent:selected_apt",
        displayName: "Search Selected Apartment",
        description: "Apartment complex selected directly from a search suggestion or autocomplete match",
        scope: "EVENT",
        requiredCore: false,
    },
    {
        parameterName: "zone",
        apiName: "customEvent:zone",
        displayName: "Living Zone Key",
        description: "Dongtan living zone identifier for donut fullscreen modal interactions",
        scope: "EVENT",
        requiredCore: false,
    },
    {
        parameterName: "calculator_type",
        apiName: "customEvent:calculator_type",
        displayName: "Calculator Type",
        description: "Target diagnosis calculator type (mortgage, jeonse_safety, property_tax, sell_timing, compare, policy_loan)",
        scope: "EVENT",
        requiredCore: false,
    },
    {
        parameterName: "tab_name",
        apiName: "customEvent:tab_name",
        displayName: "Navigation Tab Name",
        description: "Selected navigation tab identifier for tab_view (overview, imjang, stats, guide, technovalley, lounge)",
        scope: "EVENT",
        requiredCore: false,
    },
];
exports.DVIEW_AD_TELEMETRY_CUSTOM_METRICS = [
    {
        parameterName: "dwell_time_ms",
        apiName: "customEvent:dwell_time_ms",
        displayName: "Ad Slot Dwell Time ms",
        description: "Accumulated active-view dwell duration in milliseconds at telemetry emission",
        scope: "EVENT",
        measurementUnit: "MILLISECONDS",
    },
    {
        parameterName: "intersection_ratio",
        apiName: "customEvent:intersection_ratio",
        displayName: "Ad Viewport Intersection Ratio",
        description: "Viewport intersection ratio [0.0..1.0] at ad_telemetry emission",
        scope: "EVENT",
        measurementUnit: "STANDARD",
    },
];
function computeCustomDimensionCoverage(metadataDimensions = [], metadataMetrics = []) {
    const dimSet = new Set(metadataDimensions
        .map((d) => (typeof d.apiName === "string" ? d.apiName.trim() : ""))
        .filter((s) => s.length > 0));
    const metSet = new Set(metadataMetrics
        .map((m) => (typeof m.apiName === "string" ? m.apiName.trim() : ""))
        .filter((s) => s.length > 0));
    const registeredCoreDimensions = [];
    const missingCoreDimensions = [];
    const registeredExtendedDimensions = [];
    const missingExtendedDimensions = [];
    const registeredInteractionDimensions = [];
    const missingInteractionDimensions = [];
    const legacyAliasDimensions = [];
    for (const spec of exports.DVIEW_AD_TELEMETRY_CUSTOM_DIMENSIONS) {
        const exists = dimSet.has(spec.apiName);
        if (!exists && spec.legacyApiNames) {
            const legacyMatch = spec.legacyApiNames.find((l) => dimSet.has(l));
            if (legacyMatch) {
                legacyAliasDimensions.push({
                    parameterName: spec.parameterName,
                    canonicalApiName: spec.apiName,
                    activeLegacyApiName: legacyMatch,
                });
            }
        }
        if (spec.requiredCore) {
            if (exists)
                registeredCoreDimensions.push(spec.parameterName);
            else
                missingCoreDimensions.push(spec.parameterName);
        }
        else if (exists) {
            registeredExtendedDimensions.push(spec.parameterName);
        }
        else {
            missingExtendedDimensions.push(spec.parameterName);
        }
    }
    for (const spec of exports.DVIEW_INTERACTION_CUSTOM_DIMENSIONS) {
        if (dimSet.has(spec.apiName))
            registeredInteractionDimensions.push(spec.parameterName);
        else
            missingInteractionDimensions.push(spec.parameterName);
    }
    const registeredMetrics = [];
    const missingMetrics = [];
    for (const met of exports.DVIEW_AD_TELEMETRY_CUSTOM_METRICS) {
        if (metSet.has(met.apiName))
            registeredMetrics.push(met.parameterName);
        else
            missingMetrics.push(met.parameterName);
    }
    return {
        coreComplete: missingCoreDimensions.length === 0,
        allDimensionsComplete: missingCoreDimensions.length === 0 && missingExtendedDimensions.length === 0,
        interactionComplete: missingInteractionDimensions.length === 0,
        allMetricsComplete: missingMetrics.length === 0,
        registeredCoreDimensions,
        missingCoreDimensions,
        registeredExtendedDimensions,
        missingExtendedDimensions,
        registeredInteractionDimensions,
        missingInteractionDimensions,
        legacyAliasDimensions,
        registeredMetrics,
        missingMetrics,
    };
}
// ============================================================================
// 2. Deterministic Credential Loader
// ============================================================================
/**
 * Resolves GA4 Service Account credentials and default Property ID from process.env
 * or workspace `.env.local` files without requiring external JSON key files.
 * Complexity: Time O(L) where L is line count of .env.local, Space O(L), Side-effects: True (FS Read).
 */
function loadGaCredentials() {
    const envCandidates = {};
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
                    if (!trimmed || trimmed.startsWith("#"))
                        continue;
                    const eqIdx = trimmed.indexOf("=");
                    if (eqIdx <= 0)
                        continue;
                    const key = trimmed.slice(0, eqIdx).trim();
                    let val = trimmed.slice(eqIdx + 1).trim();
                    if ((val.startsWith('"') && val.endsWith('"')) ||
                        (val.startsWith("'") && val.endsWith("'"))) {
                        val = val.slice(1, -1);
                    }
                    if (!envCandidates[key]) {
                        envCandidates[key] = val;
                    }
                }
            }
            catch {
                // Continue to next candidate path
            }
        }
    }
    const rawEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
        envCandidates["GOOGLE_SERVICE_ACCOUNT_EMAIL"] ||
        "";
    const rawKey = process.env.GOOGLE_PRIVATE_KEY ||
        envCandidates["GOOGLE_PRIVATE_KEY"] ||
        "";
    const rawPropertyId = process.env.GA_PROPERTY_ID ||
        envCandidates["GA_PROPERTY_ID"] ||
        "527874632";
    const rawMeasurementId = process.env.NEXT_PUBLIC_GA_ID || envCandidates["NEXT_PUBLIC_GA_ID"];
    const rawProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
        envCandidates["NEXT_PUBLIC_FIREBASE_PROJECT_ID"];
    const formattedKey = rawKey.replace(/\\n/g, "\n").replace(/"/g, "");
    const parsed = exports.GaCredentialsSchema.safeParse({
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
// ============================================================================
// 2b. Pure IPv4 (family: 4) HTTPS REST & Cached OAuth2 RS256 Transport
// ============================================================================
const DEFAULT_CONNECT_TIMEOUT_MS = 3500;
const DEFAULT_READ_TIMEOUT_MS = Number(process.env.GA4_REST_TIMEOUT_MS) > 0
    ? Number(process.env.GA4_REST_TIMEOUT_MS)
    : 25000;
const ipv4KeepAliveAgent = new https.Agent({
    keepAlive: true,
    family: 4,
    maxSockets: 6,
    keepAliveMsecs: 10000,
});
class Ga4HttpError extends Error {
    status;
    elapsedMs;
    responseText;
    constructor(message, status, elapsedMs, responseText) {
        super(message);
        this.name = "Ga4HttpError";
        this.status = status;
        this.elapsedMs = elapsedMs;
        this.responseText = responseText;
    }
}
exports.Ga4HttpError = Ga4HttpError;
function decompressResponseBuffer(buf, contentEncoding) {
    const enc = (Array.isArray(contentEncoding)
        ? contentEncoding[0] ?? ""
        : contentEncoding ?? "")
        .toLowerCase()
        .trim();
    if (enc === "gzip") {
        return zlib.gunzipSync(buf).toString("utf8");
    }
    if (enc === "deflate") {
        return zlib.inflateSync(buf).toString("utf8");
    }
    return buf.toString("utf8");
}
function executeSingleIpv4Request(urlStr, options, useKeepAliveAgent) {
    return new Promise((resolve) => {
        const t0 = Date.now();
        const url = new URL(urlStr);
        const method = options.method ?? "GET";
        const connectTimeoutMs = options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS;
        const readTimeoutMs = options.readTimeoutMs ?? DEFAULT_READ_TIMEOUT_MS;
        const bodyBuf = options.body !== undefined && options.body.length > 0
            ? Buffer.from(options.body, "utf8")
            : undefined;
        const headers = {
            "Accept-Encoding": "identity",
            ...(options.headers ?? {}),
        };
        if (!useKeepAliveAgent) {
            headers["Connection"] = "close";
        }
        if (bodyBuf) {
            headers["Content-Length"] = String(bodyBuf.byteLength);
        }
        else if (method === "POST" && !headers["Content-Length"]) {
            headers["Content-Length"] = "0";
        }
        let settled = false;
        let tlsConnected = false;
        let headersReceived = false;
        let readTimer = null;
        let connectTimer = null;
        const cleanupTimers = () => {
            if (connectTimer) {
                clearTimeout(connectTimer);
                connectTimer = null;
            }
            if (readTimer) {
                clearTimeout(readTimer);
                readTimer = null;
            }
        };
        const finish = (result) => {
            if (settled)
                return;
            settled = true;
            cleanupTimers();
            resolve(result);
        };
        const req = https.request({
            protocol: url.protocol,
            hostname: url.hostname,
            servername: url.hostname,
            port: url.port ? Number(url.port) : 443,
            path: `${url.pathname}${url.search}`,
            method,
            family: 4,
            agent: useKeepAliveAgent ? ipv4KeepAliveAgent : false,
            headers,
        }, (res) => {
            headersReceived = true;
            tlsConnected = true;
            if (connectTimer) {
                clearTimeout(connectTimer);
                connectTimer = null;
            }
            const chunks = [];
            res.on("data", (chunk) => {
                chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
            });
            res.on("end", () => {
                const status = res.statusCode ?? 500;
                let text = "";
                try {
                    text = decompressResponseBuffer(Buffer.concat(chunks), res.headers["content-encoding"]);
                }
                catch {
                    text = Buffer.concat(chunks).toString("utf8");
                }
                finish({
                    response: {
                        ok: status >= 200 && status < 300,
                        status,
                        headers: res.headers,
                        text,
                        elapsedMs: Date.now() - t0,
                    },
                    tlsConnected,
                    reusedSocket: Boolean(req.reusedSocket),
                });
            });
        });
        const armReadTimer = () => {
            if (readTimer)
                return;
            readTimer = setTimeout(() => {
                const err = new Error(`READ_TIMEOUT after ${Date.now() - t0}ms (${url.hostname}${url.pathname})`);
                req.destroy(err);
                finish({
                    error: err,
                    tlsConnected: true,
                    reusedSocket: Boolean(req.reusedSocket),
                });
            }, readTimeoutMs);
        };
        connectTimer = setTimeout(() => {
            if (!tlsConnected) {
                const err = new Error(`CONNECT_TIMEOUT after ${Date.now() - t0}ms (${url.hostname}${url.pathname})`);
                req.destroy(err);
                finish({
                    error: err,
                    tlsConnected: false,
                    reusedSocket: Boolean(req.reusedSocket),
                });
            }
        }, connectTimeoutMs);
        req.on("socket", (sock) => {
            const tlsSocket = sock;
            if (req.reusedSocket && tlsSocket.encrypted && !tlsSocket.connecting) {
                tlsConnected = true;
                if (connectTimer) {
                    clearTimeout(connectTimer);
                    connectTimer = null;
                }
                armReadTimer();
            }
            else {
                sock.once("secureConnect", () => {
                    tlsConnected = true;
                    if (connectTimer) {
                        clearTimeout(connectTimer);
                        connectTimer = null;
                    }
                    armReadTimer();
                });
            }
        });
        req.on("error", (err) => {
            finish({
                error: err instanceof Error ? err : new Error(String(err)),
                tlsConnected: tlsConnected || headersReceived,
                reusedSocket: Boolean(req.reusedSocket),
            });
        });
        if (bodyBuf) {
            req.write(bodyBuf);
        }
        req.end();
    });
}
/**
 * Executes an IPv4-enforced (`family: 4`) HTTPS request with two-tier timeouts.
 * Only retries once on a fresh non-pooled socket if failure occurred BEFORE TLS/headers
 * (connect timeout or stale keep-alive socket reset), avoiding duplicate GA4 :runReport executions.
 */
async function ipv4HttpsRequest(urlStr, options = {}) {
    const first = await executeSingleIpv4Request(urlStr, options, true);
    if (first.response) {
        return first.response;
    }
    const firstErr = first.error ?? new Error("Unknown IPv4 HTTPS request error");
    const isPreTlsFailure = !first.tlsConnected;
    const isStaleKeepAliveReset = first.reusedSocket &&
        /ECONNRESET|socket hang up|EPIPE|ECONNABORTED/i.test(firstErr.message);
    if (!isPreTlsFailure && !isStaleKeepAliveReset) {
        throw firstErr;
    }
    const second = await executeSingleIpv4Request(urlStr, options, false);
    if (second.response) {
        return second.response;
    }
    throw second.error ?? firstErr;
}
const oauthTokenCache = new Map();
/**
 * Mints and caches an OAuth2 Bearer access token using RS256 JWT over IPv4 REST.
 */
async function getGa4AccessToken(creds, scopes) {
    const normalizedScopes = Array.from(new Set(scopes.map((s) => s.trim()).filter((s) => s.length > 0))).sort();
    const scopeKey = normalizedScopes.join(" ");
    const cacheKey = `${creds.clientEmail}\u0000${scopeKey}`;
    const nowMs = Date.now();
    const existing = oauthTokenCache.get(cacheKey);
    if (existing && existing.expiresAtMs - nowMs > 60_000) {
        return existing.accessToken;
    }
    const iat = Math.floor(nowMs / 1000) - 10;
    const exp = iat + 3600;
    const headerB64 = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
    const payloadB64 = Buffer.from(JSON.stringify({
        iss: creds.clientEmail,
        scope: scopeKey,
        aud: "https://oauth2.googleapis.com/token",
        iat,
        exp,
    })).toString("base64url");
    const signInput = `${headerB64}.${payloadB64}`;
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(signInput);
    const signatureB64 = signer.sign(creds.privateKey, "base64url");
    const assertion = `${signInput}.${signatureB64}`;
    const body = new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
    }).toString();
    const res = await ipv4HttpsRequest("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
    });
    if (!res.ok) {
        throw new Ga4HttpError(`OAuth token exchange HTTP ${res.status}: ${res.text.slice(0, 300)}`, res.status, res.elapsedMs, res.text);
    }
    const parsed = JSON.parse(res.text);
    if (typeof parsed.access_token !== "string" || !parsed.access_token) {
        throw new Error("OAuth token response missing access_token");
    }
    const expiresInSec = typeof parsed.expires_in === "number" && parsed.expires_in > 0
        ? parsed.expires_in
        : 3600;
    oauthTokenCache.set(cacheKey, {
        accessToken: parsed.access_token,
        expiresAtMs: nowMs + expiresInSec * 1000,
    });
    return parsed.access_token;
}
const GA4_READONLY_SCOPES = [
    "https://www.googleapis.com/auth/analytics.readonly",
];
function parseGa4RestJson(res, label) {
    const trimmed = res.text.trim();
    const isHtml = trimmed.startsWith("<!DOCTYPE") ||
        trimmed.startsWith("<html") ||
        trimmed.startsWith("<HTML");
    if (!res.ok) {
        if (isHtml) {
            throw new Ga4HttpError(`${label} HTTP ${res.status} (Upstream Google ESF HTML error in ${res.elapsedMs}ms)`, res.status, res.elapsedMs, trimmed.slice(0, 300));
        }
        let detail = trimmed.slice(0, 350);
        try {
            const errJson = JSON.parse(trimmed);
            if (errJson.error?.message) {
                detail = errJson.error.status
                    ? `${errJson.error.status}: ${errJson.error.message}`
                    : errJson.error.message;
            }
        }
        catch {
            // keep raw snippet
        }
        throw new Ga4HttpError(`${label} HTTP ${res.status}: ${detail}`, res.status, res.elapsedMs, res.text);
    }
    return (trimmed ? JSON.parse(trimmed) : {});
}
async function ga4RestGetMetadata(creds, propertyId) {
    const token = await getGa4AccessToken(creds, GA4_READONLY_SCOPES);
    const res = await ipv4HttpsRequest(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}/metadata`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
        },
    });
    return parseGa4RestJson(res, "getMetadata");
}
async function ga4RestRunReport(creds, propertyId, body) {
    const token = await getGa4AccessToken(creds, GA4_READONLY_SCOPES);
    // REST v1beta takes property in the URL path; omit empty dimensions/optional fields
    const payload = {
        dateRanges: body.dateRanges,
        metrics: body.metrics,
    };
    if (body.dimensions && body.dimensions.length > 0) {
        payload.dimensions = body.dimensions;
    }
    if (body.dimensionFilter !== undefined) {
        payload.dimensionFilter = body.dimensionFilter;
    }
    if (body.orderBys && body.orderBys.length > 0) {
        payload.orderBys = body.orderBys;
    }
    if (body.limit !== undefined) {
        payload.limit = body.limit;
    }
    const res = await ipv4HttpsRequest(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify(payload),
    });
    return parseGa4RestJson(res, "runReport");
}
async function ga4RestRunRealtimeReport(creds, propertyId, body) {
    const token = await getGa4AccessToken(creds, GA4_READONLY_SCOPES);
    const payload = {
        metrics: body.metrics,
    };
    if (body.dimensions && body.dimensions.length > 0) {
        payload.dimensions = body.dimensions;
    }
    if (body.limit !== undefined) {
        payload.limit = body.limit;
    }
    const res = await ipv4HttpsRequest(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify(payload),
    });
    return parseGa4RestJson(res, "runRealtimeReport");
}
/**
 * Formats a report response into a deterministic array of key-value records.
 * Complexity: Time O(N * M) where N = rows, M = dimensions + metrics; Space O(N * M); Side-effects: False.
 */
function normalizeReportRows(dimensionHeaders, metricHeaders, rows) {
    const dimNames = (dimensionHeaders || []).map((h, idx) => h.name || `dimension_${idx}`);
    const metNames = (metricHeaders || []).map((h, idx) => h.name || `metric_${idx}`);
    return (rows || []).map((row) => {
        const record = {};
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
function buildFaultResponse(fault, isError = true) {
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(fault, null, 2),
            },
        ],
        isError,
    };
}
// ============================================================================
// 3. MCP Server Registration & Tool Handlers
// ============================================================================
const server = new index_js_1.Server({
    name: "google-analytics",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "ga4_run_report",
                description: "Run a custom Google Analytics 4 (GA4) Data API report for the specified date range, dimensions, and metrics. Defaults to DVIEW property 527874632.",
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
                            description: "GA4 metric names (e.g. ['activeUsers', 'screenPageViews', 'sessions', 'eventCount'])",
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
                description: "Run a Google Analytics 4 (GA4) Realtime report showing active users, screen views, and events over the last 30 minutes.",
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
                            description: "Realtime dimensions (e.g. ['unifiedScreenName', 'eventName', 'country', 'deviceCategory'])",
                        },
                        metrics: {
                            type: "array",
                            items: { type: "string" },
                            description: "Realtime metrics (e.g. ['activeUsers', 'screenPageViews', 'eventCount'])",
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
                description: "Retrieve available GA4 dimensions and metrics metadata for the property, including custom definitions.",
                inputSchema: {
                    type: "object",
                    properties: {
                        propertyId: {
                            type: "string",
                            description: "GA4 Property ID (defaults to 527874632)",
                        },
                        searchQuery: {
                            type: "string",
                            description: "Optional keyword filter on apiName, uiName, description, or category",
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
                description: "Fetch a comprehensive DVIEW KPI & Telemetry report combining overall KPIs (MAU/DAU, sessions, views, engagement), daily trend, top pages, and custom event counts (page_view, ad_telemetry, apartment search/view).",
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
                description: "Query Google Analytics Admin API v1beta for property configuration and web data streams (requires analyticsadmin.googleapis.com enabled in GCP).",
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
            {
                name: "ga4_sync_custom_dimensions",
                description: "Idempotently register DVIEW event-scoped custom dimensions (ad_telemetry: slot_id, event_type, apartment_name, user_agent_category, placement_slot_id, cpa_campaign_id, dong; interaction/funnel: search_term, surface, view_type, trigger, chapter_id, selected_apt, zone, calculator_type, tab_name) and custom metrics (dwell_time_ms, intersection_ratio) via Google Analytics Admin API v1beta.",
                inputSchema: {
                    type: "object",
                    properties: {
                        propertyId: {
                            type: "string",
                            description: "GA4 Property ID (defaults to 527874632)",
                        },
                        dryRun: {
                            type: "boolean",
                            description: "Preview planned custom dimensions/metrics without creating them (default: false)",
                        },
                        includeExtendedDimensions: {
                            type: "boolean",
                            description: "Include placement_slot_id, cpa_campaign_id, and dong in addition to the 4 core dimensions (default: true)",
                        },
                        includeInteractionDimensions: {
                            type: "boolean",
                            description: "Include search_term, surface, view_type, trigger, chapter_id, selected_apt, zone, calculator_type, and tab_name for search & funnel analytics (default: true)",
                        },
                        includeMetrics: {
                            type: "boolean",
                            description: "Also register dwell_time_ms and intersection_ratio custom metrics (default: true)",
                        },
                    },
                },
            },
            {
                name: "ga4_get_ad_telemetry_report",
                description: "Run a metadata-aware GA4 ad_telemetry report supporting per-slot and VIEWABLE_IMPRESSION breakdowns when custom dimensions are registered, with graceful pagePath + deviceCategory fallback when unregistered.",
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
                        limit: {
                            type: "number",
                            description: "Max rows to return (1..1000, default: 250)",
                        },
                    },
                },
            },
        ],
    };
});
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    if (!cachedCredentials) {
        return buildFaultResponse({
            faultVector: [
                "ERR_GA4_CREDENTIALS_MISSING",
                "loadGaCredentials",
                "NULL_CREDENTIALS",
            ],
            recoveryInvariant: "Ensure GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and GA_PROPERTY_ID exist in frontend/.env.local.",
        });
    }
    const toolName = request.params.name;
    const rawArgs = request.params.arguments ?? {};
    try {
        // ------------------------------------------------------------------------
        // Tool 1: ga4_run_report
        // ------------------------------------------------------------------------
        if (toolName === "ga4_run_report") {
            const parsed = exports.Ga4RunReportInputSchema.safeParse(rawArgs);
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
            const { propertyId = cachedCredentials.propertyId, startDate, endDate, dimensions, metrics, dimensionFilterField, dimensionFilterValue, orderByMetric, orderDesc, limit, } = parsed.data;
            const response = await ga4RestRunReport(cachedCredentials, propertyId, {
                dateRanges: [{ startDate, endDate }],
                dimensions: dimensions.map((name) => ({ name })),
                metrics: metrics.map((name) => ({ name })),
                dimensionFilter: dimensionFilterField && dimensionFilterValue !== undefined
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
            const rows = normalizeReportRows(response.dimensionHeaders, response.metricHeaders, response.rows);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            propertyId,
                            dateRange: { startDate, endDate },
                            rowCount: response.rowCount ?? rows.length,
                            rows,
                        }, null, 2),
                    },
                ],
            };
        }
        // ------------------------------------------------------------------------
        // Tool 2: ga4_run_realtime_report
        // ------------------------------------------------------------------------
        if (toolName === "ga4_run_realtime_report") {
            const parsed = exports.Ga4RunRealtimeReportInputSchema.safeParse(rawArgs);
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
            const { propertyId = cachedCredentials.propertyId, dimensions, metrics, limit, } = parsed.data;
            const response = await ga4RestRunRealtimeReport(cachedCredentials, propertyId, {
                dimensions: dimensions.map((name) => ({ name })),
                metrics: metrics.map((name) => ({ name })),
                limit,
            });
            const rows = normalizeReportRows(response.dimensionHeaders, response.metricHeaders, response.rows);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            propertyId,
                            window: "last_30_minutes",
                            rowCount: response.rowCount ?? rows.length,
                            rows,
                        }, null, 2),
                    },
                ],
            };
        }
        // ------------------------------------------------------------------------
        // Tool 3: ga4_get_metadata
        // ------------------------------------------------------------------------
        if (toolName === "ga4_get_metadata") {
            const parsed = exports.Ga4GetMetadataInputSchema.safeParse(rawArgs);
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
            const { propertyId = cachedCredentials.propertyId, searchQuery, includeDimensions, includeMetrics, customOnly, limit, } = parsed.data;
            const metadata = await ga4RestGetMetadata(cachedCredentials, propertyId);
            const queryLower = searchQuery ? searchQuery.toLowerCase() : "";
            const allDimensions = metadata.dimensions || [];
            const allMetrics = metadata.metrics || [];
            const filteredDimensions = includeDimensions
                ? allDimensions
                    .filter((d) => {
                    if (customOnly && !d.customDefinition)
                        return false;
                    if (!queryLower)
                        return true;
                    const haystack = `${d.apiName ?? ""} ${d.uiName ?? ""} ${d.description ?? ""} ${d.category ?? ""}`.toLowerCase();
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
                    if (customOnly && !m.customDefinition)
                        return false;
                    if (!queryLower)
                        return true;
                    const haystack = `${m.apiName ?? ""} ${m.uiName ?? ""} ${m.description ?? ""} ${m.category ?? ""}`.toLowerCase();
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
                        text: JSON.stringify({
                            propertyId,
                            totalAvailableDimensions: allDimensions.length,
                            totalAvailableMetrics: allMetrics.length,
                            returnedDimensionsCount: filteredDimensions.length,
                            returnedMetricsCount: filteredMetrics.length,
                            dimensions: filteredDimensions,
                            metrics: filteredMetrics,
                        }, null, 2),
                    },
                ],
            };
        }
        // ------------------------------------------------------------------------
        // Tool 4: ga4_get_dview_funnel_telemetry
        // ------------------------------------------------------------------------
        if (toolName === "ga4_get_dview_funnel_telemetry") {
            const parsed = exports.Ga4DviewFunnelInputSchema.safeParse(rawArgs);
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
            const { propertyId = cachedCredentials.propertyId, startDate, endDate, topPagesLimit, } = parsed.data;
            // Batch A & Batch B stay within GA4's concurrent-requests quota limit
            const [metadataRes, overviewRes, dailyRes] = await Promise.all([
                ga4RestGetMetadata(cachedCredentials, propertyId),
                ga4RestRunReport(cachedCredentials, propertyId, {
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
                ga4RestRunReport(cachedCredentials, propertyId, {
                    dateRanges: [{ startDate, endDate }],
                    dimensions: [{ name: "date" }],
                    metrics: [
                        { name: "activeUsers" },
                        { name: "screenPageViews" },
                        { name: "sessions" },
                    ],
                    orderBys: [{ dimension: { dimensionName: "date" }, desc: false }],
                }),
            ]);
            const [pagesRes, eventsRes] = await Promise.all([
                ga4RestRunReport(cachedCredentials, propertyId, {
                    dateRanges: [{ startDate, endDate }],
                    dimensions: [{ name: "pagePath" }],
                    metrics: [
                        { name: "screenPageViews" },
                        { name: "activeUsers" },
                        { name: "averageSessionDuration" },
                    ],
                    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
                    limit: topPagesLimit,
                }),
                ga4RestRunReport(cachedCredentials, propertyId, {
                    dateRanges: [{ startDate, endDate }],
                    dimensions: [{ name: "eventName" }],
                    metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
                    orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
                    limit: 50,
                }),
            ]);
            const overviewRows = normalizeReportRows(overviewRes.dimensionHeaders, overviewRes.metricHeaders, overviewRes.rows);
            const dailyTrend = normalizeReportRows(dailyRes.dimensionHeaders, dailyRes.metricHeaders, dailyRes.rows);
            const topPages = normalizeReportRows(pagesRes.dimensionHeaders, pagesRes.metricHeaders, pagesRes.rows);
            const eventBreakdown = normalizeReportRows(eventsRes.dimensionHeaders, eventsRes.metricHeaders, eventsRes.rows);
            const customDimensionCoverage = computeCustomDimensionCoverage(metadataRes.dimensions || [], metadataRes.metrics || []);
            const registeredMetaDimNames = new Set((metadataRes.dimensions || [])
                .map((d) => (typeof d.apiName === "string" ? d.apiName.trim() : ""))
                .filter((s) => s.length > 0));
            const resolveDim = (spec) => {
                if (registeredMetaDimNames.has(spec.apiName))
                    return spec.apiName;
                if (spec.builtInApiName && registeredMetaDimNames.has(spec.builtInApiName)) {
                    return spec.builtInApiName;
                }
                return null;
            };
            const searchTermSpec = exports.DVIEW_INTERACTION_CUSTOM_DIMENSIONS.find((d) => d.parameterName === "search_term");
            const surfaceSpec = exports.DVIEW_INTERACTION_CUSTOM_DIMENSIONS.find((d) => d.parameterName === "surface");
            const viewTypeSpec = exports.DVIEW_INTERACTION_CUSTOM_DIMENSIONS.find((d) => d.parameterName === "view_type");
            const triggerSpec = exports.DVIEW_INTERACTION_CUSTOM_DIMENSIONS.find((d) => d.parameterName === "trigger");
            const tabNameSpec = exports.DVIEW_INTERACTION_CUSTOM_DIMENSIONS.find((d) => d.parameterName === "tab_name");
            const searchQueryDims = [];
            const resolvedSearchTermDim = searchTermSpec ? resolveDim(searchTermSpec) : null;
            const resolvedSurfaceDim = surfaceSpec ? resolveDim(surfaceSpec) : null;
            const resolvedViewTypeDim = viewTypeSpec ? resolveDim(viewTypeSpec) : null;
            const resolvedTriggerDim = triggerSpec ? resolveDim(triggerSpec) : null;
            const resolvedTabNameDim = tabNameSpec ? resolveDim(tabNameSpec) : null;
            if (resolvedSearchTermDim)
                searchQueryDims.push(resolvedSearchTermDim);
            if (resolvedSurfaceDim)
                searchQueryDims.push(resolvedSurfaceDim);
            const aptViewDims = [];
            if (resolvedSurfaceDim)
                aptViewDims.push(resolvedSurfaceDim);
            if (resolvedViewTypeDim)
                aptViewDims.push(resolvedViewTypeDim);
            if (registeredMetaDimNames.has("customEvent:apartment_name")) {
                aptViewDims.push("customEvent:apartment_name");
            }
            const tabViewDims = [];
            if (resolvedTabNameDim)
                tabViewDims.push(resolvedTabNameDim);
            if (resolvedSurfaceDim)
                tabViewDims.push(resolvedSurfaceDim);
            if (resolvedTriggerDim)
                tabViewDims.push(resolvedTriggerDim);
            const [searchRes, aptViewRes, tabViewRes] = await Promise.all([
                searchQueryDims.length > 0
                    ? ga4RestRunReport(cachedCredentials, propertyId, {
                        dateRanges: [{ startDate, endDate }],
                        dimensions: searchQueryDims.map((name) => ({ name })),
                        metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
                        dimensionFilter: {
                            filter: {
                                fieldName: "eventName",
                                stringFilter: { matchType: "EXACT", value: "search_query" },
                            },
                        },
                        orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
                        limit: 30,
                    })
                    : Promise.resolve(null),
                aptViewDims.length > 0
                    ? ga4RestRunReport(cachedCredentials, propertyId, {
                        dateRanges: [{ startDate, endDate }],
                        dimensions: aptViewDims.map((name) => ({ name })),
                        metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
                        dimensionFilter: {
                            filter: {
                                fieldName: "eventName",
                                stringFilter: { matchType: "EXACT", value: "apartment_view" },
                            },
                        },
                        orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
                        limit: 30,
                    })
                    : Promise.resolve(null),
                tabViewDims.length > 0
                    ? ga4RestRunReport(cachedCredentials, propertyId, {
                        dateRanges: [{ startDate, endDate }],
                        dimensions: tabViewDims.map((name) => ({ name })),
                        metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
                        dimensionFilter: {
                            filter: {
                                fieldName: "eventName",
                                stringFilter: { matchType: "EXACT", value: "tab_view" },
                            },
                        },
                        orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
                        limit: 30,
                    })
                    : Promise.resolve(null),
            ]);
            const topSearchTerms = searchRes
                ? normalizeReportRows(searchRes.dimensionHeaders, searchRes.metricHeaders, searchRes.rows)
                : [];
            const apartmentViewsBySurfaceAndType = aptViewRes
                ? normalizeReportRows(aptViewRes.dimensionHeaders, aptViewRes.metricHeaders, aptViewRes.rows)
                : [];
            const tabViewsBySurfaceAndTrigger = tabViewRes
                ? normalizeReportRows(tabViewRes.dimensionHeaders, tabViewRes.metricHeaders, tabViewRes.rows)
                : [];
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
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
                            adTelemetryCustomDimensionCoverage: customDimensionCoverage,
                            customDimensionCoverage,
                            dailyTrend,
                            topPages,
                            eventBreakdown,
                            interactionDimensionsResolved: {
                                search_term: resolvedSearchTermDim,
                                surface: resolvedSurfaceDim,
                                view_type: resolvedViewTypeDim,
                                trigger: resolvedTriggerDim,
                                tab_name: resolvedTabNameDim,
                            },
                            topSearchTerms,
                            apartmentViewsBySurfaceAndType,
                            tabViewsBySurfaceAndTrigger,
                        }, null, 2),
                    },
                ],
            };
        }
        // ------------------------------------------------------------------------
        // Tool 5: ga4_get_property_admin_info
        // ------------------------------------------------------------------------
        if (toolName === "ga4_get_property_admin_info") {
            const parsed = exports.Ga4AdminInfoInputSchema.safeParse(rawArgs);
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
            const propertyId = parsed.data.propertyId ?? cachedCredentials.propertyId;
            const accessToken = await getGa4AccessToken(cachedCredentials, GA4_READONLY_SCOPES);
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
                ipv4HttpsRequest(`https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        Accept: "application/json",
                    },
                }),
                ipv4HttpsRequest(`https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}/dataStreams`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        Accept: "application/json",
                    },
                }),
            ]);
            const readSafeTextAndJson = (res) => {
                const text = res.text;
                if (!text)
                    return { text: "", json: {} };
                try {
                    const parsedJson = JSON.parse(text);
                    const JsonPayloadSchema = zod_1.z.object({}).passthrough();
                    const checked = JsonPayloadSchema.safeParse(parsedJson);
                    return { text, json: checked.success ? checked.data : {} };
                }
                catch {
                    return { text, json: {} };
                }
            };
            const propPayload = readSafeTextAndJson(propRes);
            const streamsPayload = readSafeTextAndJson(streamsRes);
            if (!propRes.ok) {
                const lowerText = propPayload.text.toLowerCase();
                const urlMatch = propPayload.text.match(/https:\/\/console\.developers\.google\.com\/apis\/api\/analyticsadmin\.googleapis\.com\/overview\?project=\d+/);
                const activationUrl = urlMatch?.[0] ??
                    "https://console.developers.google.com/apis/api/analyticsadmin.googleapis.com/overview?project=388809605487";
                if (propRes.status === 403 &&
                    (lowerText.includes("service_disabled") ||
                        lowerText.includes("analyticsadmin.googleapis.com"))) {
                    return buildFaultResponse({
                        faultVector: [
                            "ERR_GA4_ADMIN_API_DISABLED",
                            `properties/${propertyId}`,
                            "HTTP_403_SERVICE_DISABLED",
                        ],
                        recoveryInvariant: "Enable Google Analytics Admin API in GCP Console if administrative metadata inspection is required. All GA4 Data API reporting tools remain 100% operational.",
                        details: {
                            activationUrl,
                            serviceAccount: cachedCredentials.clientEmail,
                            propertyId,
                        },
                    }, false);
                }
                if (propRes.status === 403) {
                    return buildFaultResponse({
                        faultVector: [
                            "ERR_GA4_INSUFFICIENT_ROLE",
                            `properties/${propertyId}`,
                            "HTTP_403_PERMISSION_DENIED",
                        ],
                        recoveryInvariant: "Grant Viewer/Editor access on the GA4 Property to the configured service account in GA4 Admin -> Property Access Management.",
                        details: {
                            serviceAccount: cachedCredentials.clientEmail,
                            propertyId,
                        },
                    }, false);
                }
                return buildFaultResponse({
                    faultVector: [
                        "ERR_GA4_ADMIN_API_FAILURE",
                        `properties/${propertyId}`,
                        `HTTP_${propRes.status}`,
                    ],
                    recoveryInvariant: propPayload.text.slice(0, 300),
                });
            }
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            propertyId,
                            property: propPayload.json,
                            dataStreams: streamsPayload.json,
                        }, null, 2),
                    },
                ],
            };
        }
        // ------------------------------------------------------------------------
        // Tool 6: ga4_sync_custom_dimensions
        // ------------------------------------------------------------------------
        if (toolName === "ga4_sync_custom_dimensions") {
            const parsed = exports.Ga4SyncCustomDimensionsInputSchema.safeParse(rawArgs);
            if (!parsed.success) {
                return buildFaultResponse({
                    faultVector: [
                        "ERR_ZOD_VALIDATION",
                        "ga4_sync_custom_dimensions",
                        parsed.error.message,
                    ],
                    recoveryInvariant: "Provide valid sync parameters.",
                });
            }
            const { propertyId = cachedCredentials.propertyId, dryRun, includeExtendedDimensions, includeInteractionDimensions, includeMetrics, } = parsed.data;
            const accessToken = await getGa4AccessToken(cachedCredentials, [
                "https://www.googleapis.com/auth/analytics.edit",
            ]);
            if (!accessToken) {
                return buildFaultResponse({
                    faultVector: [
                        "ERR_OAUTH_TOKEN_EMPTY",
                        "ga4_sync_custom_dimensions",
                        "NO_BEARER_TOKEN",
                    ],
                    recoveryInvariant: "Verify service account private key validity.",
                });
            }
            const baseAdminUrl = `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}`;
            const targetDims = [
                ...exports.DVIEW_AD_TELEMETRY_CUSTOM_DIMENSIONS.filter((d) => d.requiredCore || includeExtendedDimensions),
                ...(includeInteractionDimensions
                    ? exports.DVIEW_INTERACTION_CUSTOM_DIMENSIONS
                    : []),
            ];
            const targetMetrics = includeMetrics
                ? [...exports.DVIEW_AD_TELEMETRY_CUSTOM_METRICS]
                : [];
            const fetchPaginatedNames = async (endpoint, key) => {
                const names = new Set();
                const displayNamesLower = new Set();
                let pageToken = "";
                for (let page = 0; page < 20; page++) {
                    const url = new URL(endpoint);
                    url.searchParams.set("pageSize", "200");
                    if (pageToken)
                        url.searchParams.set("pageToken", pageToken);
                    const res = await ipv4HttpsRequest(url.toString(), {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            Accept: "application/json",
                        },
                    });
                    const bodyText = res.text;
                    if (!res.ok) {
                        return { ok: false, status: res.status, bodyText };
                    }
                    const json = (bodyText ? JSON.parse(bodyText) : {});
                    const list = Array.isArray(json[key]) ? json[key] : [];
                    for (const item of list) {
                        if (typeof item === "object" && item !== null) {
                            const typedItem = item;
                            if (typeof typedItem.parameterName === "string") {
                                names.add(typedItem.parameterName.trim());
                            }
                            if (key === "customDimensions" &&
                                typeof typedItem.displayName === "string") {
                                const dn = typedItem.displayName.trim().toLowerCase();
                                if (dn.length > 0)
                                    displayNamesLower.add(dn);
                            }
                        }
                    }
                    const next = typeof json.nextPageToken === "string"
                        ? json.nextPageToken.trim()
                        : "";
                    if (!next)
                        break;
                    pageToken = next;
                }
                return { ok: true, names, displayNamesLower };
            };
            const buildAdminFault = (status, bodyText) => {
                const lower = bodyText.toLowerCase();
                const urlMatch = bodyText.match(/https:\/\/console\.developers\.google\.com\/apis\/api\/analyticsadmin\.googleapis\.com\/overview\?project=\d+/);
                const activationUrl = urlMatch?.[0] ??
                    "https://console.developers.google.com/apis/api/analyticsadmin.googleapis.com/overview?project=388809605487";
                if (status === 403 &&
                    (lower.includes("service_disabled") ||
                        lower.includes("analyticsadmin.googleapis.com"))) {
                    return buildFaultResponse({
                        faultVector: [
                            "ERR_GA4_ADMIN_API_DISABLED",
                            `properties/${propertyId}/customDimensions`,
                            "HTTP_403_SERVICE_DISABLED",
                        ],
                        recoveryInvariant: "1) Enable Google Analytics Admin API at activationUrl. 2) Ensure serviceAccount has Editor role on GA4 Property 527874632. 3) Re-run ga4_sync_custom_dimensions or `npm run ga4:sync-dimensions`.",
                        details: {
                            activationUrl,
                            serviceAccount: cachedCredentials.clientEmail,
                            propertyId,
                            plannedDimensions: targetDims
                                .map((d) => d.parameterName)
                                .join(", "),
                            plannedMetrics: targetMetrics
                                .map((m) => m.parameterName)
                                .join(", "),
                        },
                    }, false);
                }
                if (status === 403) {
                    return buildFaultResponse({
                        faultVector: [
                            "ERR_GA4_INSUFFICIENT_ROLE",
                            `properties/${propertyId}/customDimensions`,
                            "HTTP_403_PERMISSION_DENIED",
                        ],
                        recoveryInvariant: "Grant GA4 Property Editor role to the service account in GA4 Admin -> Property Access Management, then re-run ga4_sync_custom_dimensions.",
                        details: {
                            serviceAccount: cachedCredentials.clientEmail,
                            propertyId,
                        },
                    }, false);
                }
                return buildFaultResponse({
                    faultVector: [
                        "ERR_GA4_ADMIN_API_FAILURE",
                        `properties/${propertyId}`,
                        `HTTP_${status}`,
                    ],
                    recoveryInvariant: bodyText.slice(0, 300),
                });
            };
            const dimsList = await fetchPaginatedNames(`${baseAdminUrl}/customDimensions`, "customDimensions");
            if (!dimsList.ok) {
                return buildAdminFault(dimsList.status, dimsList.bodyText);
            }
            const alreadyExistingDimensions = targetDims
                .filter((d) => dimsList.names.has(d.parameterName))
                .map((d) => d.parameterName);
            const missingDims = targetDims.filter((d) => !dimsList.names.has(d.parameterName));
            let alreadyExistingMetrics = [];
            let missingMetrics = targetMetrics;
            if (targetMetrics.length > 0) {
                const metsList = await fetchPaginatedNames(`${baseAdminUrl}/customMetrics`, "customMetrics");
                if (!metsList.ok) {
                    return buildAdminFault(metsList.status, metsList.bodyText);
                }
                alreadyExistingMetrics = targetMetrics
                    .filter((m) => metsList.names.has(m.parameterName))
                    .map((m) => m.parameterName);
                missingMetrics = targetMetrics.filter((m) => !metsList.names.has(m.parameterName));
            }
            if (dryRun) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                propertyId,
                                status: "DRY_RUN",
                                dryRun: true,
                                alreadyExistingDimensions,
                                plannedDimensions: missingDims.map((d) => d.parameterName),
                                alreadyExistingMetrics,
                                plannedMetrics: missingMetrics.map((m) => m.parameterName),
                            }, null, 2),
                        },
                    ],
                };
            }
            const createdDimensions = [];
            const builtInMappedNotes = [];
            const existingDisplayNamesLower = dimsList.displayNamesLower;
            const postCustomDimension = async (dim, displayName) => {
                const res = await ipv4HttpsRequest(`${baseAdminUrl}/customDimensions`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify({
                        parameterName: dim.parameterName,
                        displayName,
                        description: dim.description,
                        scope: dim.scope,
                    }),
                });
                return { ok: res.ok, status: res.status, bodyText: res.text };
            };
            for (const dim of missingDims) {
                const disambiguatedName = `${dim.displayName} (${dim.parameterName})`.slice(0, 82);
                let effectiveDisplayName = existingDisplayNamesLower.has(dim.displayName.trim().toLowerCase())
                    ? disambiguatedName
                    : dim.displayName;
                let postRes = await postCustomDimension(dim, effectiveDisplayName);
                if (!postRes.ok) {
                    const lowerErr = postRes.bodyText.toLowerCase();
                    const isDisplayNameErr = lowerErr.includes("display_name") || lowerErr.includes("display name");
                    if (isDisplayNameErr && effectiveDisplayName !== disambiguatedName) {
                        effectiveDisplayName = disambiguatedName;
                        postRes = await postCustomDimension(dim, effectiveDisplayName);
                    }
                }
                if (postRes.ok) {
                    existingDisplayNamesLower.add(effectiveDisplayName.trim().toLowerCase());
                    createdDimensions.push(dim.parameterName);
                    continue;
                }
                const lowerBody = postRes.bodyText.toLowerCase();
                const isDisplayNameError = lowerBody.includes("display_name") || lowerBody.includes("display name");
                if ((postRes.status === 409 || lowerBody.includes("already_exists")) &&
                    !isDisplayNameError) {
                    alreadyExistingDimensions.push(dim.parameterName);
                    continue;
                }
                if (postRes.status === 400 && dim.builtInApiName) {
                    alreadyExistingDimensions.push(dim.parameterName);
                    builtInMappedNotes.push(`${dim.parameterName} mapped to built-in GA4 dimension (${dim.builtInApiName}).`);
                    continue;
                }
                return buildAdminFault(postRes.status, postRes.bodyText);
            }
            const createdMetrics = [];
            for (const met of missingMetrics) {
                const res = await ipv4HttpsRequest(`${baseAdminUrl}/customMetrics`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify({
                        parameterName: met.parameterName,
                        displayName: met.displayName,
                        description: met.description,
                        scope: met.scope,
                        measurementUnit: met.measurementUnit,
                    }),
                });
                const bodyText = res.text;
                if (res.ok) {
                    createdMetrics.push(met.parameterName);
                }
                else if (res.status === 409 ||
                    bodyText.toLowerCase().includes("already_exists")) {
                    alreadyExistingMetrics.push(met.parameterName);
                }
                else {
                    return buildAdminFault(res.status, bodyText);
                }
            }
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            propertyId,
                            status: "SYNCED",
                            dryRun: false,
                            alreadyExistingDimensions,
                            createdDimensions,
                            alreadyExistingMetrics,
                            createdMetrics,
                            builtInMappedNotes,
                        }, null, 2),
                    },
                ],
            };
        }
        // ------------------------------------------------------------------------
        // Tool 7: ga4_get_ad_telemetry_report
        // ------------------------------------------------------------------------
        if (toolName === "ga4_get_ad_telemetry_report") {
            const parsed = exports.Ga4AdTelemetryReportInputSchema.safeParse(rawArgs);
            if (!parsed.success) {
                return buildFaultResponse({
                    faultVector: [
                        "ERR_ZOD_VALIDATION",
                        "ga4_get_ad_telemetry_report",
                        parsed.error.message,
                    ],
                    recoveryInvariant: "Provide valid ad_telemetry report parameters.",
                });
            }
            const { propertyId = cachedCredentials.propertyId, startDate, endDate, limit, } = parsed.data;
            const metadata = await ga4RestGetMetadata(cachedCredentials, propertyId);
            const metaDims = metadata.dimensions || [];
            const metaMetrics = metadata.metrics || [];
            const coverage = computeCustomDimensionCoverage(metaDims, metaMetrics);
            const registeredDimNames = new Set(metaDims
                .map((d) => (typeof d.apiName === "string" ? d.apiName.trim() : ""))
                .filter((s) => s.length > 0));
            const registeredMetricNames = new Set(metaMetrics
                .map((m) => (typeof m.apiName === "string" ? m.apiName.trim() : ""))
                .filter((s) => s.length > 0));
            const dimensionsQueried = ["pagePath", "deviceCategory"];
            for (const spec of exports.DVIEW_AD_TELEMETRY_CUSTOM_DIMENSIONS) {
                if (dimensionsQueried.length >= 8)
                    break;
                if (registeredDimNames.has(spec.apiName)) {
                    dimensionsQueried.push(spec.apiName);
                }
                else if (spec.legacyApiNames) {
                    const legacyMatch = spec.legacyApiNames.find((l) => registeredDimNames.has(l));
                    if (legacyMatch) {
                        dimensionsQueried.push(legacyMatch);
                    }
                }
            }
            const metricsQueried = ["eventCount", "totalUsers"];
            for (const met of exports.DVIEW_AD_TELEMETRY_CUSTOM_METRICS) {
                if (registeredMetricNames.has(met.apiName)) {
                    metricsQueried.push(met.apiName);
                }
            }
            const mode = coverage.coreComplete
                ? "FULL_SLOT_BREAKDOWN"
                : coverage.registeredCoreDimensions.length > 0 ||
                    coverage.registeredExtendedDimensions.length > 0 ||
                    coverage.legacyAliasDimensions.length > 0
                    ? "PARTIAL_CUSTOM_BREAKDOWN"
                    : "PAGE_DEVICE_FALLBACK";
            const response = await ga4RestRunReport(cachedCredentials, propertyId, {
                dateRanges: [{ startDate, endDate }],
                dimensions: dimensionsQueried.map((name) => ({ name })),
                metrics: metricsQueried.map((name) => ({ name })),
                dimensionFilter: {
                    filter: {
                        fieldName: "eventName",
                        stringFilter: {
                            matchType: "EXACT",
                            value: "ad_telemetry",
                        },
                    },
                },
                orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
                limit,
            });
            const rows = normalizeReportRows(response.dimensionHeaders, response.metricHeaders, response.rows);
            const normalizeDimVal = (val) => {
                if (val === undefined || val === null)
                    return "(not set)";
                const str = String(val).trim();
                return str.length === 0 ? "(not set)" : str;
            };
            let totalAdTelemetryEvents = 0;
            let impressionEvents = 0;
            let viewableImpressionEvents = 0;
            let unclassifiedHistoricalEvents = 0;
            const byEventType = {};
            const byCpaCampaign = {};
            const pageDeviceMap = new Map();
            const slotEventMap = new Map();
            for (const row of rows) {
                const count = Number(row.eventCount ?? 0);
                if (!Number.isFinite(count) || count <= 0)
                    continue;
                totalAdTelemetryEvents += count;
                const pagePath = normalizeDimVal(row.pagePath);
                const deviceCategory = normalizeDimVal(row.deviceCategory);
                const slotId = normalizeDimVal(row["customEvent:slot_id"]);
                const placementSlotId = normalizeDimVal(row["customEvent:placement_slot_id"]);
                const canonicalCpa = normalizeDimVal(row["customEvent:cpa_campaign_id"]);
                const legacyCpa = normalizeDimVal(row["customEvent:campaign_id"]);
                const cpaCampaignId = canonicalCpa !== "(not set)" ? canonicalCpa : legacyCpa;
                const rawEvType = normalizeDimVal(row["customEvent:event_type"]);
                const evType = rawEvType === "CLICK" && slotId.startsWith("guide_")
                    ? "GUIDE_PREVIEW_CLICK"
                    : rawEvType;
                const apartmentName = normalizeDimVal(row["customEvent:apartment_name"]);
                const userAgentCategory = normalizeDimVal(row["customEvent:user_agent_category"]);
                if (evType === "IMPRESSION") {
                    impressionEvents += count;
                }
                if (evType === "VIEWABLE_IMPRESSION") {
                    viewableImpressionEvents += count;
                }
                if (evType === "(not set)") {
                    unclassifiedHistoricalEvents += count;
                }
                byEventType[evType] = (byEventType[evType] ?? 0) + count;
                if (cpaCampaignId !== "(not set)") {
                    byCpaCampaign[cpaCampaignId] =
                        (byCpaCampaign[cpaCampaignId] ?? 0) + count;
                }
                const pdKey = `${pagePath}\u0000${deviceCategory}`;
                const existingPd = pageDeviceMap.get(pdKey);
                if (existingPd) {
                    existingPd.eventCount += count;
                }
                else {
                    pageDeviceMap.set(pdKey, {
                        pagePath,
                        deviceCategory,
                        eventCount: count,
                    });
                }
                const hasAnySlotDimension = "customEvent:slot_id" in row ||
                    "customEvent:event_type" in row ||
                    "customEvent:apartment_name" in row ||
                    "customEvent:user_agent_category" in row ||
                    "customEvent:cpa_campaign_id" in row ||
                    "customEvent:campaign_id" in row;
                if (hasAnySlotDimension) {
                    const seKey = `${slotId}\u0000${placementSlotId}\u0000${cpaCampaignId}\u0000${evType}\u0000${apartmentName}\u0000${userAgentCategory}`;
                    const existingSe = slotEventMap.get(seKey);
                    if (existingSe) {
                        existingSe.eventCount += count;
                    }
                    else {
                        slotEventMap.set(seKey, {
                            slotId,
                            placementSlotId,
                            cpaCampaignId,
                            eventType: evType,
                            apartmentName,
                            userAgentCategory,
                            eventCount: count,
                        });
                    }
                }
            }
            const byPageAndDevice = Array.from(pageDeviceMap.values()).sort((a, b) => b.eventCount - a.eventCount || a.pagePath.localeCompare(b.pagePath));
            const bySlotAndEventType = Array.from(slotEventMap.values()).sort((a, b) => b.eventCount - a.eventCount || a.slotId.localeCompare(b.slotId));
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            propertyId,
                            dateRange: { startDate, endDate },
                            mode,
                            coverage,
                            dimensionsQueried,
                            metricsQueried,
                            summary: {
                                totalAdTelemetryEvents,
                                impressionEvents,
                                viewableImpressionEvents,
                                unclassifiedHistoricalEvents,
                                byEventType,
                                byCpaCampaign,
                                byPageAndDevice,
                                bySlotAndEventType,
                            },
                            rowCount: response.rowCount ?? rows.length,
                            rows,
                        }, null, 2),
                    },
                ],
            };
        }
        return buildFaultResponse({
            faultVector: ["ERR_UNKNOWN_TOOL", toolName, "METHOD_NOT_FOUND"],
            recoveryInvariant: "Invoke one of: ga4_run_report, ga4_run_realtime_report, ga4_get_metadata, ga4_get_dview_funnel_telemetry, ga4_get_property_admin_info, ga4_sync_custom_dimensions, ga4_get_ad_telemetry_report.",
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        let faultCode = "ERR_GA4_EXECUTION_FAILURE";
        let recoveryInvariant = "Verify GA4 metric/dimension names via ga4_get_metadata and check network connectivity.";
        if (/CONNECT_TIMEOUT|READ_TIMEOUT/i.test(message)) {
            faultCode = "ERR_GA4_TIMEOUT";
            recoveryInvariant =
                "GA4 IPv4 HTTPS request timed out waiting for connect/TLS or upstream response; retry with a narrower date range or limit.";
        }
        else if (err instanceof Ga4HttpError &&
            (err.status === 502 || err.status === 503 || err.status === 504)) {
            faultCode = "ERR_GA4_UPSTREAM_UNAVAILABLE";
            recoveryInvariant =
                "Google Analytics Data API upstream returned a transient 502/503/504 error over IPv4; retry shortly or narrow the query scope.";
        }
        return buildFaultResponse({
            faultVector: [faultCode, toolName, message],
            recoveryInvariant,
        });
    }
});
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("GA4 MCP server running on stdio");
}
if (process.env.GA4_MCP_DISABLE_AUTOSTART !== "1") {
    main().catch((error) => {
        console.error("GA4 MCP Server fatal error:", error);
        process.exit(1);
    });
}
