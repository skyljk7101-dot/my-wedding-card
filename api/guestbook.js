const APPS_SCRIPT_GUESTBOOK_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbyoiTXZkMShjPz8orFiUCcOiGsOabXujlTAGXvTKwc8wow5nLd25HgJHw6iUEXSUoZ9/exec";

const GUESTBOOK_MESSAGE_PREFIX = "__GBV1__";
const HIDDEN_GUESTBOOK_ENTRIES = new Set([
  "codex-test::ping",
  "codex-ip-test::ping",
  "codex-cors-test::ping",
]);

function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

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

function getClientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "";
  const firstIp = forwardedFor.split(",")[0]?.trim();
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

async function parseRequestBody(request) {
  const raw = await request.text();
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function GET(request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "list";

  if (action !== "list") {
    return json({ ok: false, error: "invalid action" }, { status: 400 });
  }

  try {
    const items = await fetchGuestbookList();
    return json(items);
  } catch (error) {
    return json(
      { ok: false, error: String(error?.message || error || "unknown") },
      { status: 502 }
    );
  }
}

export async function POST(request) {
  const body = await parseRequestBody(request);
  if (!body) {
    return json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const name = String(body?.name || "").trim();
  const msg = String(body?.msg || "").trim();
  if (!name || !msg) {
    return json({ ok: false, error: "missing fields" }, { status: 400 });
  }

  try {
    const result = await addGuestbookEntry({
      name,
      msg,
      ip: getClientIp(request),
    });
    return json({ ok: true, ts: result.ts });
  } catch (error) {
    return json(
      { ok: false, error: String(error?.message || error || "unknown") },
      { status: 502 }
    );
  }
}
