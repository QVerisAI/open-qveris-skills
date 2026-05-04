const REGION_URLS = {
  global: "https://qveris.ai/api/v1",
  cn: "https://qveris.cn/api/v1",
};

function resolveBaseUrl(apiKey) {
  if (process.env.QVERIS_BASE_URL) {
    return process.env.QVERIS_BASE_URL.replace(/\/+$/, "");
  }
  if (process.env.QVERIS_REGION) {
    const region = process.env.QVERIS_REGION.toLowerCase();
    return REGION_URLS[region] ?? REGION_URLS.global;
  }
  return typeof apiKey === "string" && apiKey.startsWith("sk-cn-")
    ? REGION_URLS.cn
    : REGION_URLS.global;
}

async function requestJson(path, { method = "POST", query = {}, body, timeoutMs = 30000, apiKey }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = new URL(`${resolveBaseUrl(apiKey)}${path}`);
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
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export function getBaseUrl() {
  return resolveBaseUrl(process.env.QVERIS_API_KEY);
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

export async function getCredits({ apiKey, timeoutMs = 30000 }) {
  return requestJson("/auth/credits", {
    method: "GET",
    apiKey,
    timeoutMs,
  });
}

export async function getUsageHistory({ apiKey, query = {}, timeoutMs = 30000 }) {
  return requestJson("/auth/usage/history/v2", {
    method: "GET",
    apiKey,
    query,
    timeoutMs,
  });
}

export async function getCreditsLedger({ apiKey, query = {}, timeoutMs = 30000 }) {
  return requestJson("/auth/credits/ledger", {
    method: "GET",
    apiKey,
    query,
    timeoutMs,
  });
}
