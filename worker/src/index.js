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
    // Canonical origin first: https and no www, before any credentials travel.
    const url = new URL(request.url);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (!local && (url.protocol === "http:" || url.hostname.startsWith("www."))) {
      url.protocol = "https:";
      if (url.hostname.startsWith("www.")) url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 301);
    }

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

    // html_handling = "none" (wrangler.toml) serves asset paths literally:
    // it stopped mapping "/" to "/index.html", and stopped treating an
    // extensionless URL as an alias for its .html file. Replace just those
    // two pieces of the old default behavior that the site still needs.
    let assetRequest = request;
    if (url.pathname === "/") {
      const indexUrl = new URL(url);
      indexUrl.pathname = "/index.html";
      assetRequest = new Request(indexUrl, request);
    }

    let asset = await env.ASSETS.fetch(assetRequest);

    // Pre-existing extensionless URLs (indexed before the site standardized
    // on .html canonicals): 301 to the .html file instead of 404-ing, so
    // links and bookmarks out there keep working.
    if (asset.status === 404 && !url.pathname.endsWith("/") && !url.pathname.includes(".")) {
      const htmlUrl = new URL(url);
      htmlUrl.pathname = url.pathname + ".html";
      const htmlAsset = await env.ASSETS.fetch(new Request(htmlUrl, request));
      if (htmlAsset.ok) {
        return Response.redirect(htmlUrl.toString(), 301);
      }
    }

    const res = new Response(asset.body, asset);
    if (gated) {
      res.headers.set("Cache-Control", "no-store");
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
    } else {
      // Images, CSS and JS live under /assets/. CSS/JS are not hashed, so one week tops.
      res.headers.set(
        "Cache-Control",
        asset.ok && url.pathname.startsWith("/assets/")
          ? "public, max-age=604800"
          : "public, max-age=300, stale-while-revalidate=86400",
      );
      res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
      res.headers.set("X-Content-Type-Options", "nosniff");
      res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
      res.headers.set("X-Frame-Options", "SAMEORIGIN");
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
