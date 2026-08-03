#!/usr/bin/env python3
"""Construye PREVIEW.html: index.html en un solo archivo, sin una sola peticion externa."""
import base64, re, pathlib

ROOT = pathlib.Path("/Users/reneangel/vetrehab-website")
SITE = ROOT / "site"

html = (SITE / "index.html").read_text(encoding="utf-8")
css = (SITE / "assets" / "style.css").read_text(encoding="utf-8")
js = (SITE / "assets" / "site.js").read_text(encoding="utf-8")
logo = base64.b64encode((SITE / "assets" / "logo-vetrehab.jpg").read_bytes()).decode()
LOGO_URI = "data:image/jpeg;base64," + logo

# 1. Cabecera: fuera canonical, og, preconnect, hojas remotas, favicons remotos.
html = re.sub(r'\n\s*<link rel="canonical"[^>]*>', "", html)
html = re.sub(r'\n\s*<meta property="og:[^>]*>', "", html)
html = re.sub(r'\n\s*<link rel="preconnect"[^>]*>', "", html)
html = re.sub(r'\n\s*<link rel="stylesheet" href="https://[^>]*>', "", html)
html = re.sub(r"\n\s*<noscript><link rel=\"stylesheet\" href=\"https://[^<]*</noscript>", "", html)
html = re.sub(r'\n\s*<link rel="(icon|apple-touch-icon)"[^>]*>', "", html)

# 2. Titulo de la vista previa.
html = re.sub(r"<title>.*?</title>", "<title>Vista previa | Vet Rehab Costa Rica</title>", html, flags=re.S)

# 3. CSS y JS en linea.
html = html.replace(
    '<link rel="stylesheet" href="assets/style.css">',
    "<style>\n" + css + "\n</style>",
)
html = html.replace(
    '<script src="assets/site.js" defer></script>',
    "<script>\n" + js + "\n</script>",
)

# 4. Logotipo como data URI (favicon incluido).
html = html.replace('href="assets/logo-vetrehab.jpg"', 'href="' + LOGO_URI + '"')
html = html.replace('src="assets/logo-vetrehab.jpg"', 'src="' + LOGO_URI + '"')
html = html.replace(
    "</head>",
    '<link rel="icon" href="' + LOGO_URI + '" sizes="any">\n</head>',
)

# 5. JSON-LD: metadato con URLs remotas, sin valor en una vista previa local.
html = re.sub(r'\n<script type="application/ld\+json">.*?</script>\n', "\n", html, flags=re.S)

# 6. Enlaces salientes -> ancla inerte. La vista previa no navega fuera del archivo.
html = re.sub(r'href="https?://[^"]*"', 'href="#"', html)

# 7. Navegacion interna: resuelta contra site/ para que la vista previa se pueda recorrer.
html = re.sub(r'href="(?!#|data:|mailto:|tel:|site/)([a-z0-9-]+\.html)', r'href="site/\1', html)

(ROOT / "PREVIEW.html").write_text(html, encoding="utf-8")

# --- Verificacion ---
out = (ROOT / "PREVIEW.html").read_text(encoding="utf-8")
# El unico "//" legitimo vive dentro del base64 del logotipo; se excluye del barrido.
scan = re.sub(r"data:image/jpeg;base64,[A-Za-z0-9+/=]+", "DATA_URI", out)
print("bytes:", len(out))
print("http:/https: ->", re.findall(r"https?:", scan))
print("protocolo relativo // ->", re.findall(r"(?<!:)//", scan))
print("[CONFIRMAR] conservados:", out.count("[CONFIRMAR"))
print("titulo ok:", "<title>Vista previa | Vet Rehab Costa Rica</title>" in out)
print("data URI del logo:", out.count("data:image/jpeg;base64"))
print("src/href que salen del archivo:",
      sorted(set(re.findall(r'(?:src|href)="(?!#|data:|mailto:|tel:)([^"]*)"', out))))
