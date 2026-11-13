/**
 * CORS proxy for data.gov.ma (v1.2)
 * ==================================
 * Runs as a Vercel serverless function in production AND inside the Vite dev
 * server (see vite.config.js), so `npm run dev` hits the same code path.
 *
 *   GET /api/ckan?endpoint=package_search&q=...
 *   GET /api/ckan?endpoint=resource_proxy&url=https://data.gov.ma/...xlsx
 *
 * v1.2: base URL auto-detection (data.gov.ma has served CKAN under both
 * /data/api/3/action and /api/3/action), host allow-list incl. sub-domains,
 * 25 MB download cap, binary-safe responses.
 */

const CANDIDATE_BASES = (process.env.CKAN_BASE ? [process.env.CKAN_BASE] : [])
  .concat(["https://data.gov.ma/data/api/3/action", "https://data.gov.ma/api/3/action"]);

const ALLOWED_ENDPOINTS = new Set([
  "package_search", "package_show", "current_package_list_with_resources",
  "resource_search", "datastore_search", "resource_proxy"
]);
const ALLOWED_FILE_HOSTS = ["data.gov.ma", "hcp.ma"];
const MAX_BYTES = 25 * 1024 * 1024;
const UA = "HCP-Charts-Addin/1.2 (+PowerPoint add-in)";

let workingBase = null;

function hostAllowed(hostname) {
  return ALLOWED_FILE_HOSTS.some(h => hostname === h || hostname.endsWith("." + h));
}

async function ckanGet(endpoint, query) {
  const bases = workingBase ? [workingBase] : CANDIDATE_BASES;
  let last = null;
  for (const base of bases) {
    const url = `${base}/${endpoint}${query ? "?" + query : ""}`;
    try {
      const r = await fetch(url, { headers: { Accept: "application/json", "User-Agent": UA } });
      const ct = r.headers.get("content-type") || "";
      if (!ct.includes("json")) { last = { status: 502, error: `Réponse non-JSON de ${base}` }; continue; }
      const body = await r.json();
      if (r.ok || body.success === false) { workingBase = base; return { status: r.status, body }; }
      last = { status: r.status, error: `${r.status} ${r.statusText}` };
    } catch (e) {
      last = { status: 502, error: e.message };
    }
  }
  return { status: last?.status || 502, body: { success: false, error: last?.error || "CKAN injoignable" } };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Use GET." });

  const { endpoint, ...params } = req.query || {};
  if (!endpoint) return res.status(400).json({ success: false, error: "Missing 'endpoint'." });
  if (!ALLOWED_ENDPOINTS.has(endpoint)) {
    return res.status(403).json({ success: false, error: `Endpoint '${endpoint}' not allowed.` });
  }

  try {
    if (endpoint === "resource_proxy") {
      let target;
      try { target = new URL(params.url); } catch { return res.status(400).json({ success: false, error: "Invalid 'url'." }); }
      if (!/^https?:$/.test(target.protocol) || !hostAllowed(target.hostname)) {
        return res.status(403).json({ success: false, error: `Host not allowed: ${target.hostname}` });
      }
      const r = await fetch(target.toString(), { headers: { "User-Agent": UA, Accept: "*/*" }, redirect: "follow" });
      if (!r.ok) return res.status(r.status).json({ success: false, error: `Download failed: ${r.status} ${r.statusText}` });
      const len = parseInt(r.headers.get("content-length") || "0", 10);
      if (len > MAX_BYTES) return res.status(413).json({ success: false, error: "File too large (> 25 MB)." });
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > MAX_BYTES) return res.status(413).json({ success: false, error: "File too large (> 25 MB)." });
      res.setHeader("Content-Type", r.headers.get("content-type") || "application/octet-stream");
      res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
      return res.status(200).send(buf);
    }

    const query = new URLSearchParams(params).toString();
    const { status, body } = await ckanGet(endpoint, query);
    if (body.success !== false) res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=3600");
    return res.status(status).json(body);
  } catch (error) {
    return res.status(500).json({ success: false, error: `Proxy error: ${error.message}` });
  }
}
