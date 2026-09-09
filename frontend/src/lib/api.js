const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function _call(path, opts = {}) {
  const url = `${BASE}${path}`;

  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
  });

  if (res.status === 204) return null;

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const msg =
      payload?.detail ||
      (typeof payload === "string" ? payload : `Request failed (${res.status})`);
    throw new Error(msg);
  }

  return payload;
}

export function get(path) {
  return _call(path, { method: "GET" });
}

export function post(path, body) {
  return _call(path, { method: "POST", body: JSON.stringify(body) });
}

export function patch(path, body) {
  return _call(path, { method: "PATCH", body: JSON.stringify(body) });
}

export function del(path) {
  return _call(path, { method: "DELETE" });
}
