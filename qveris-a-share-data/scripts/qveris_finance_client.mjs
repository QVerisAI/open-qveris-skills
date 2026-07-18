const BASE_URL = (process.env.QVERIS_BASE_URL || "https://qveris.ai/api/v1").replace(/\/$/, "");

export function readQverisApiKey() {
  const value = process.env.QVERIS_API_KEY?.trim();
  if (!value) throw new Error("QVERIS_API_KEY is not set");
  return value;
}

async function requestJson(path, { method = "GET", query = {}, body, apiKey, timeoutMs = 30_000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = new URL(`${BASE_URL}${path}`);
    for (const [name, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) url.searchParams.set(name, String(value));
    }
    const response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: controller.signal,
    });
    const text = await response.text();
    let payload;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = { message: text.slice(0, 500) }; }
    if (!response.ok) {
      const error = new Error(payload?.message || `HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

export function listCapabilities({ apiKey, domain = "finance", page = 1, pageSize = 100, timeoutMs = 30_000 }) {
  return requestJson("/capabilities", { apiKey, query: { domain, page, page_size: pageSize }, timeoutMs });
}

export function getCapability({ apiKey, capabilityId, timeoutMs = 30_000 }) {
  return requestJson(`/capabilities/${encodeURIComponent(capabilityId)}`, { apiKey, timeoutMs });
}

export function queryCapability({ apiKey, capabilityId, parameters, strategy = "best", searchId, timeoutMs = 60_000 }) {
  return requestJson("/capabilities/query", {
    method: "POST",
    apiKey,
    body: { capability_id: capabilityId, parameters, strategy, ...(searchId ? { search_id: searchId } : {}) },
    timeoutMs,
  });
}

export function financeTransport(apiKey) {
  return {
    listCapabilities: (options) => listCapabilities({ apiKey, ...options }),
    getCapability: (options) => getCapability({ apiKey, ...options }),
    queryCapability: (options) => queryCapability({ apiKey, ...options }),
  };
}
