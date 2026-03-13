const APPS_SCRIPT_GUESTBOOK_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbyoiTXZkMShjPz8orFiUCcOiGsOabXujlTAGXvTKwc8wow5nLd25HgJHw6iUEXSUoZ9/exec";

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

  const items = await res.json();
  if (!Array.isArray(items)) {
    throw new Error("Guestbook list failed: invalid json");
  }

  return items
    .map((item) => {
      const decoded = decodeGuestbookMessage(item?.msg);
      return {
        ts: item?.ts,
        name: String(item?.name || ""),
        msg: decoded.msg,
      };
    })
    .filter((item) => !isHiddenGuestbookEntry(item));
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
