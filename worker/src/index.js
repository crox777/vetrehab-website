// Basic-auth gate in front of the static site.
// The Worker runs before any asset is served, so nothing reaches the client
// until credentials check out. Disabling JavaScript or reading the page source
// does not bypass it, and there is no unprotected origin URL.

const REALM = 'Basic realm="VetRehab - vista previa privada", charset="UTF-8"';

const DENIED = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Acceso restringido</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
background:#3D3C4C;color:#fff;font:16px/1.5 system-ui,sans-serif;text-align:center;padding:24px}
p{max-width:28rem;margin:0}</style></head><body>
<p>Este sitio esta en vista previa privada y requiere contrasena.</p></body></html>`;

export default {
  async fetch(request, env) {
    const gated = env.GATE !== "off";
    if (gated && !authorized(request, env)) {
      return new Response(DENIED, {
        status: 401,
        headers: {
          "WWW-Authenticate": REALM,
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    const url = new URL(request.url);
    if (url.hostname.startsWith("www.")) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 301);
    }

    const asset = await env.ASSETS.fetch(request);
    const res = new Response(asset.body, asset);
    if (gated) {
      res.headers.set("Cache-Control", "no-store");
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
    } else {
      res.headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=86400");
      res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    return res;
  },
};

function authorized(request, env) {
  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Basic ")) return false;

  let decoded;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }

  const i = decoded.indexOf(":");
  if (i < 0) return false;

  return (
    safeEqual(decoded.slice(0, i), env.GATE_USER) &&
    safeEqual(decoded.slice(i + 1), env.GATE_PASS)
  );
}

// Constant-time-ish comparison so response timing does not leak the password.
function safeEqual(a, b) {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    diff |= (x[i] || 0) ^ (y[i] || 0);
  }
  return diff === 0;
}
