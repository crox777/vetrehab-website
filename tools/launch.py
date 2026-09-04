#!/usr/bin/env python3
"""Switch the public site between preview (gated, noindex) and launched (open, indexable).

usage: python3 tools/launch.py preview|launch

preview: every page noindex,nofollow; robots.txt disallows all; Worker gate on.
launch:  robots meta removed; robots.txt allows every crawler, including AI
         crawlers, and points at the sitemap; Worker gate off.

After running, deploy: `npx wrangler deploy`. The Worker reads the GATE var
from wrangler.toml, so the same deploy applies both halves.
"""
import glob, re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
mode = sys.argv[1] if len(sys.argv) > 1 else ""
if mode not in ("preview", "launch"):
    sys.exit(__doc__)

ROBOTS = {
    "preview": "User-agent: *\nDisallow: /\n",
    "launch": (
        "User-agent: *\nAllow: /\n\n"
        "# AI crawlers are welcome; the site is written to be read and cited.\n"
        "User-agent: GPTBot\nAllow: /\n\nUser-agent: ChatGPT-User\nAllow: /\n\n"
        "User-agent: ClaudeBot\nAllow: /\n\nUser-agent: anthropic-ai\nAllow: /\n\n"
        "User-agent: PerplexityBot\nAllow: /\n\nUser-agent: Google-Extended\nAllow: /\n\n"
        "User-agent: Bingbot\nAllow: /\n\nUser-agent: Applebot\nAllow: /\n\n"
        "Sitemap: https://vetrehab.cr/sitemap.xml\n"
    ),
}

for f in glob.glob(str(ROOT / "site" / "*.html")):
    s = pathlib.Path(f).read_text()
    s = re.sub(r'<meta name="robots" content="[^"]*">\n?', "", s)
    if mode == "preview":
        s = s.replace('<link rel="canonical"', '<meta name="robots" content="noindex,nofollow">\n<link rel="canonical"', 1) if 'rel="canonical"' in s else s.replace("</title>", '</title>\n<meta name="robots" content="noindex,nofollow">', 1)
    pathlib.Path(f).write_text(s)

(ROOT / "site" / "robots.txt").write_text(ROBOTS[mode])

toml = ROOT / "wrangler.toml"
t = toml.read_text()
t = re.sub(r'GATE = "(on|off)"', f'GATE = "{"on" if mode == "preview" else "off"}"', t)
toml.write_text(t)
print(f"{mode}: robots meta {'set' if mode == 'preview' else 'removed'}, robots.txt written, GATE={'on' if mode == 'preview' else 'off'}. Now: npx wrangler deploy")
