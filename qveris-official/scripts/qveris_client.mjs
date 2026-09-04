const DEFAULT_BASE_URL = "https://qveris.ai/api/v1";

function baseUrl() {
  const configured = String(process.env.QVERIS_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const parsed = new URL(configured);
  if (parsed.protocol !== "https:") throw new Error("QVERIS_BASE_URL must use HTTPS");
  if (!new Set(["qveris.ai", "api.qveris.cloud"]).has(parsed.hostname)
      || parsed.pathname !== "/api/v1"
      || parsed.username
      || parsed.password
      || parsed.port) {
    throw new Error("QVERIS_BASE_URL must use an approved QVeris /api/v1 host");
  }
  return configured;
}

export class QVerisHttpError extends Error {
  constructor({ status, method, path, payload, responseText }) {
    const code = payload?.error?.code ?? payload?.code ?? null;
    const serverMessage = payload?.error?.message ?? payload?.message ?? payload?.detail ?? null;
    super(
      `HTTP ${status}${code ? ` (${code})` : ""} for ${method} ${path}${serverMessage ? `: ${serverMessage}` : ""}`,
    );
    this.name = "QVerisHttpError";
    this.status = status;
    this.method = method;
    this.path = path;
    this.code = code ?? `http_${status}`;
    this.payload = payload;
    this.responseText = responseText;
  }
}

async function requestJson(path, { method = "POST", query = {}, body, timeoutMs = 30000, apiKey }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = new URL(`${baseUrl()}${path}`);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      let payload = null;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        payload = null;
      }
      throw new QVerisHttpError({
        status: response.status,
        method,
        path,
        payload,
        responseText: text,
      });
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export function getBaseUrl() {
  return baseUrl();
}

export async function discoverTools({ apiKey, query, limit = 10, timeoutMs = 30000 }) {
  return requestJson("/search", {
    apiKey,
    body: { query, limit },
    timeoutMs,
  });
}

export async function inspectToolsByIds({ apiKey, toolIds, discoveryId, timeoutMs = 30000 }) {
  const body = { tool_ids: toolIds };
  if (discoveryId) {
    body.search_id = discoveryId;
  }

  return requestJson("/tools/by-ids", {
    apiKey,
    body,
    timeoutMs,
  });
}

export async function callTool({
  apiKey,
  toolId,
  discoveryId,
  parameters,
  maxResponseSize = 20480,
  timeoutMs = 120000,
}) {
  return requestJson("/tools/execute", {
    apiKey,
    query: { tool_id: toolId },
    body: {
      search_id: discoveryId,
      parameters,
      max_response_size: maxResponseSize,
    },
    timeoutMs,
  });
}

export async function listCapabilities({
  apiKey,
  domain,
  page = 1,
  pageSize = 50,
  timeoutMs = 30000,
}) {
  return requestJson("/capabilities", {
    method: "GET",
    apiKey,
    query: {
      domain,
      page,
      page_size: pageSize,
    },
    timeoutMs,
  });
}

export async function searchCapabilities({
  apiKey,
  query,
  domain = "finance",
  limit = 5,
  timeoutMs = 30000,
}) {
  return requestJson("/capabilities/search", {
    method: "GET",
    apiKey,
    query: {
      q: query,
      domain,
      limit,
    },
    timeoutMs,
  });
}

export async function getCapability({
  apiKey,
  capabilityId,
  timeoutMs = 30000,
}) {
  return requestJson(`/capabilities/${encodeURIComponent(capabilityId)}`, {
    method: "GET",
    apiKey,
    timeoutMs,
  });
}

export async function queryCapability({
  apiKey,
  capabilityId,
  parameters,
  strategy = "best",
  searchId,
  timeoutMs = 120000,
}) {
  const body = {
    capability_id: capabilityId,
    parameters,
    strategy,
  };
  if (searchId) {
    body.search_id = searchId;
  }

  return requestJson("/capabilities/query", {
    method: "POST",
    apiKey,
    body,
    timeoutMs,
  });
}

export async function getCredits({ apiKey, timeoutMs = 30000 }) {
  return requestJson("/auth/credits", { method: "GET", apiKey, timeoutMs });
}

export async function getUsageHistory({ apiKey, query = {}, timeoutMs = 30000 }) {
  return requestJson("/auth/usage/history/v2", { method: "GET", apiKey, query, timeoutMs });
}

export async function getCreditsLedger({ apiKey, query = {}, timeoutMs = 30000 }) {
  return requestJson("/auth/credits/ledger", { method: "GET", apiKey, query, timeoutMs });
}
