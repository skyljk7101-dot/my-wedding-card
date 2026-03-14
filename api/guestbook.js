const APPS_SCRIPT_GUESTBOOK_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbzNXEZEiTW1DzOk34r79dd0HZhA5EIQ1ciaMLJc_u1Nbdu4cnetZ63Rpy7NjWtoDtPo/exec";

const GUESTBOOK_MESSAGE_PREFIX = "__GBV1__";
const HIDDEN_GUESTBOOK_ENTRIES = new Set([
  "codex-test::ping",
  "codex-ip-test::ping",
  "codex-cors-test::ping",
  "codex-proxy-test::ping",
]);

function toBase64Url(value) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(normalized + padding, "base64").toString("utf8");
}

function encodeGuestbookMessage(msg, ip) {
  return `${GUESTBOOK_MESSAGE_PREFIX}${toBase64Url(JSON.stringify({ msg, ip }))}`;
}

function decodeGuestbookMessage(rawMsg) {
  const message = String(rawMsg || "");
  if (!message.startsWith(GUESTBOOK_MESSAGE_PREFIX)) {
    return { msg: message, ip: null };
  }

  try {
    const parsed = JSON.parse(fromBase64Url(message.slice(GUESTBOOK_MESSAGE_PREFIX.length)));
    return {
      msg: typeof parsed?.msg === "string" ? parsed.msg : "",
      ip: typeof parsed?.ip === "string" ? parsed.ip : null,
    };
  } catch {
    return { msg: message, ip: null };
  }
}

function isHiddenGuestbookEntry(item) {
  const key = `${String(item?.name || "").trim()}::${String(item?.msg || "").trim()}`;
  return HIDDEN_GUESTBOOK_ENTRIES.has(key);
}

function isHeaderGuestbookEntry(item) {
  const name = String(item?.name || "").trim().toLowerCase();
  const msg = String(item?.msg || "").trim().toLowerCase();
  return name === "name" && msg === "msg";
}

function normalizeTimestamp(rawValue) {
  if (typeof rawValue === "number") {
    return Number.isFinite(rawValue) && rawValue > 0 ? rawValue : null;
  }

  const value = String(rawValue ?? "").trim();
  if (!value) return null;

  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getGuestbookField(item, keys) {
  if (!item || typeof item !== "object") return undefined;

  for (const key of keys) {
    if (item[key] !== undefined && item[key] !== null) {
      return item[key];
    }
  }

  return undefined;
}

function normalizeGuestbookItems(payload) {
  if (payload && typeof payload === "object" && !Array.isArray(payload) && payload.ok === false) {
    throw new Error(`Guestbook list failed: ${payload.error || "unknown"}`);
  }

  const rawItems = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.data)
        ? payload.data
        : null;

  if (!rawItems) {
    throw new Error("Guestbook list failed: invalid json");
  }

  return rawItems
    .map((item) => {
      const normalizedItem = Array.isArray(item)
        ? {
            ts: item[0],
            name: item[1],
            msg: item[2],
            ip: item[3],
          }
        : item;
      const decoded = decodeGuestbookMessage(
        getGuestbookField(normalizedItem, ["msg", "message", "content", "text"]),
      );

      return {
        ts: normalizeTimestamp(
          getGuestbookField(normalizedItem, ["ts", "timestamp", "createdAt", "date", "time"]),
        ),
        name: String(getGuestbookField(normalizedItem, ["name", "writer", "author"]) || "").trim(),
        msg: String(decoded.msg || "").trim(),
      };
    })
    .filter((item) => item.name && item.msg)
    .filter((item) => !isHeaderGuestbookEntry(item))
    .filter((item) => !isHiddenGuestbookEntry(item));
}

function getQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function getHeaderValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function getClientIp(request) {
  const forwardedFor = getHeaderValue(request.headers["x-forwarded-for"]) || getHeaderValue(request.headers["x-real-ip"]) || "";
  const firstIp = String(forwardedFor).split(",")[0]?.trim();
  return firstIp || "";
}

async function fetchGuestbookList() {
  const upstreamUrl = `${APPS_SCRIPT_GUESTBOOK_ENDPOINT}?action=list&_=${Date.now()}`;
  const res = await fetch(upstreamUrl, { method: "GET", cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Guestbook list failed: ${res.status}`);
  }

  return normalizeGuestbookItems(await res.json());
}

async function addGuestbookEntry({ name, msg, ip }) {
  const res = await fetch(APPS_SCRIPT_GUESTBOOK_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify({
      action: "add",
      name,
      msg: encodeGuestbookMessage(msg, ip),
      ip,
    }),
    redirect: "follow",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Guestbook add failed: ${res.status}`);
  }

  let jsonBody;
  try {
    jsonBody = await res.json();
  } catch {
    throw new Error("Guestbook add failed: invalid json");
  }

  if (!jsonBody?.ok) {
    throw new Error(`Guestbook add failed: ${jsonBody?.error || "unknown"}`);
  }

  return jsonBody;
}

async function readRequestBody(request) {
  if (request.body !== undefined && request.body !== null) {
    if (typeof request.body === "string") return request.body;
    if (Buffer.isBuffer(request.body)) return request.body.toString("utf8");
    return JSON.stringify(request.body);
  }

  return await new Promise((resolve, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
    });
    request.on("end", () => resolve(raw));
    request.on("error", reject);
  });
}

async function parseRequestBody(request) {
  const raw = await readRequestBody(request);
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function sendJson(response, statusCode, payload) {
  response.status(statusCode);
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.json(payload);
}

export default async function handler(request, response) {
  if (request.method === "GET") {
    const action = getQueryValue(request.query?.action) || "list";
    if (action !== "list") {
      sendJson(response, 400, { ok: false, error: "invalid action" });
      return;
    }

    try {
      const items = await fetchGuestbookList();
      sendJson(response, 200, items);
    } catch (error) {
      sendJson(response, 502, {
        ok: false,
        error: String(error?.message || error || "unknown"),
      });
    }
    return;
  }

  if (request.method === "POST") {
    const body = await parseRequestBody(request);
    if (!body) {
      sendJson(response, 400, { ok: false, error: "invalid json" });
      return;
    }

    const name = String(body?.name || "").trim();
    const msg = String(body?.msg || "").trim();
    if (!name || !msg) {
      sendJson(response, 400, { ok: false, error: "missing fields" });
      return;
    }

    try {
      const result = await addGuestbookEntry({
        name,
        msg,
        ip: getClientIp(request),
      });
      sendJson(response, 200, { ok: true, ts: result.ts });
    } catch (error) {
      sendJson(response, 502, {
        ok: false,
        error: String(error?.message || error || "unknown"),
      });
    }
    return;
  }

  sendJson(response, 405, { ok: false, error: "method not allowed" });
}
