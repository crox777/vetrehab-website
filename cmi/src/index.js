// cmi.vetrehab.cr
//
// Two doors, nothing else:
//   - Readers arrive through Cloudflare Access (Google/OTP identity). The Worker
//     verifies the Access JWT on every request, so the data is never served
//     to a request that did not pass Access, even if the Access application
//     is misconfigured or removed.
//   - The Apps Script feeder writes through POST /ingest with a bearer token.
//     Access is bypassed for that path only; the token is the sole credential
//     and it can write exactly one kind of object (a validated CMI document).
//
// Data lives in KV: "latest" plus one "v:<timestamp>" copy per ingest, and a
// short index in "versions" for rollback.

const IDS = ["F1","F2","F4","F5","F6","C1","C2","C4","C5","P1","P2","P3","P5","E1","E2"];
const PERSPECTIVAS = new Set(["financiera","clientes","procesos","equipo"]);
const ESTADOS = new Set(["verde","amarillo","rojo","sin_linea_base"]);
const MAX_BODY = 512 * 1024;
const KEEP_VERSIONS = 40;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/ingest") return ingest(request, env);
    if (url.pathname === "/health") return json({ ok: true });

    // Everything below is for people, behind Access.
    const who = await verifyAccess(request, env, ctx);
    if (who === "unconfigured") return text(503, "Acceso no configurado.");
    if (!who) return text(401, "Acceso denegado.");

    if (url.pathname === "/data.json") {
      const v = url.searchParams.get("v");
      const key = v && /^v:\d{8}T\d{6}Z$/.test(v) ? v : "latest";
      const body = await env.CMI_DATA.get(key);
      if (!body) return json({ error: "sin datos" }, 404);
      return new Response(body, { headers: noStore({ "Content-Type": "application/json; charset=utf-8" }) });
    }
    if (url.pathname === "/versions.json") {
      const body = (await env.CMI_DATA.get("versions")) || "[]";
      return new Response(body, { headers: noStore({ "Content-Type": "application/json; charset=utf-8" }) });
    }

    const asset = await env.ASSETS.fetch(request);
    const res = new Response(asset.body, asset);
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    res.headers.set("Referrer-Policy", "no-referrer");
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("Content-Security-Policy",
      "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'");
    return res;
  },
};

// ---------- ingest ----------

async function ingest(request, env) {
  if (request.method !== "POST") return text(405, "POST");
  if (!env.INGEST_TOKEN) return text(503, "Token no configurado.");
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || !safeEqual(token, env.INGEST_TOKEN)) return text(401, "Token inválido.");

  const len = Number(request.headers.get("Content-Length") || 0);
  if (len > MAX_BODY) return text(413, "Documento demasiado grande.");
  const raw = await request.text();
  if (raw.length > MAX_BODY) return text(413, "Documento demasiado grande.");

  let doc;
  try { doc = JSON.parse(raw); } catch { return text(400, "JSON inválido."); }
  const problems = validate(doc);
  if (problems.length) return json({ error: "documento rechazado", problemas: problems }, 422);

  doc.recibido = new Date().toISOString();
  const stamp = doc.recibido.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const key = `v:${stamp}`;
  const body = JSON.stringify(doc);

  await env.CMI_DATA.put(key, body);
  await env.CMI_DATA.put("latest", body);
  let versions = [];
  try { versions = JSON.parse((await env.CMI_DATA.get("versions")) || "[]"); } catch {}
  versions.unshift({ key, generado: doc.generado, recibido: doc.recibido, corte: doc.corte });
  const drop = versions.splice(KEEP_VERSIONS);
  await env.CMI_DATA.put("versions", JSON.stringify(versions));
  for (const old of drop) await env.CMI_DATA.delete(old.key);

  return json({ ok: true, version: key, indicadores: doc.indicadores.length });
}

// Schema check. Only aggregates are expected; any key that looks like a
// person-level field is rejected so a bug upstream cannot publish PII.
function validate(doc) {
  const p = [];
  if (!doc || typeof doc !== "object") return ["no es un objeto"];
  if (doc.version !== 1) p.push("version debe ser 1");
  if (typeof doc.generado !== "string" || isNaN(Date.parse(doc.generado))) p.push("generado inválido");
  if (!doc.corte || typeof doc.corte !== "object") p.push("falta corte");
  else for (const k of ["financiero", "agenda"]) if (!/^\d{4}-\d{2}-\d{2}$/.test(doc.corte[k] || "")) p.push(`corte.${k} inválido`);
  if (!Array.isArray(doc.indicadores)) return p.concat("indicadores debe ser una lista");
  const seen = new Set();
  for (const ind of doc.indicadores) {
    const id = ind && ind.id;
    if (!IDS.includes(id)) { p.push(`id desconocido: ${id}`); continue; }
    if (seen.has(id)) p.push(`id repetido: ${id}`);
    seen.add(id);
    if (!PERSPECTIVAS.has(ind.perspectiva)) p.push(`${id}: perspectiva inválida`);
    if (!ESTADOS.has(ind.estado)) p.push(`${id}: estado inválido`);
    for (const k of ["nombre", "definicion", "fuente", "dueno", "frecuencia", "meta", "valor", "detalle"])
      if (typeof ind[k] !== "string") p.push(`${id}: falta ${k}`);
    if (ind.serie !== undefined) {
      const s = ind.serie;
      if (!s || !Array.isArray(s.meses) || !s.valores || typeof s.valores !== "object") p.push(`${id}: serie inválida`);
      else for (const [name, arr] of Object.entries(s.valores)) {
        if (!Array.isArray(arr) || arr.length !== s.meses.length) p.push(`${id}: serie ${name} desalineada`);
        else if (arr.some(v => v !== null && typeof v !== "number")) p.push(`${id}: serie ${name} no numérica`);
      }
    }
    for (const k of Object.keys(ind)) if (/nombre_cliente|paciente|telefono|teléfono|correo|cedula|cédula|lista/i.test(k) && k !== "nombre") p.push(`${id}: campo no permitido ${k}`);
  }
  for (const id of IDS) if (!seen.has(id)) p.push(`falta ${id}`);
  return p;
}

// ---------- Access JWT ----------

let jwksCache = { at: 0, keys: null, team: "" };

async function verifyAccess(request, env, ctx) {
  const team = env.ACCESS_TEAM_DOMAIN, aud = env.ACCESS_AUD;
  if (!team || !aud) return "unconfigured";
  let jwt = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!jwt) {
    const m = (request.headers.get("Cookie") || "").match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
    jwt = m && m[1];
  }
  if (!jwt) return null;
  const parts = jwt.split(".");
  if (parts.length !== 3) return null;
  let header, payload;
  try {
    header = JSON.parse(b64urlToString(parts[0]));
    payload = JSON.parse(b64urlToString(parts[1]));
  } catch { return null; }
  if (header.alg !== "RS256") return null;
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp < now) return null;
  const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!auds.includes(aud)) return null;
  if (payload.iss !== `https://${team}`) return null;

  const keys = await jwks(team, ctx);
  const jwk = keys.find(k => k.kid === header.kid);
  if (!jwk) return null;
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlToBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  return ok ? (payload.email || "ok") : null;
}

async function jwks(team, ctx) {
  const fresh = jwksCache.keys && jwksCache.team === team && Date.now() - jwksCache.at < 6 * 3600 * 1000;
  if (fresh) return jwksCache.keys;
  const res = await fetch(`https://${team}/cdn-cgi/access/certs`, { cf: { cacheTtl: 3600 } });
  if (!res.ok) return jwksCache.keys || [];
  const body = await res.json();
  jwksCache = { at: Date.now(), keys: body.keys || [], team };
  return jwksCache.keys;
}

// ---------- helpers ----------

function b64urlToBytes(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function b64urlToString(s) { return new TextDecoder().decode(b64urlToBytes(s)); }

function safeEqual(a, b) {
  const enc = new TextEncoder();
  const x = enc.encode(a), y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}
function noStore(h) { return { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", ...h }; }
function json(obj, status = 200) { return new Response(JSON.stringify(obj), { status, headers: noStore({ "Content-Type": "application/json; charset=utf-8" }) }); }
function text(status, msg) { return new Response(msg, { status, headers: noStore({ "Content-Type": "text/plain; charset=utf-8" }) }); }
