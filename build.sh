#!/bin/sh
# Builds the deployable site into dist/ (Cloudflare Pages build command: sh build.sh).
# Source files are never modified.
set -eu

OUT=dist

# Load event.conf without clobbering values already set in the environment
while IFS='=' read -r key value; do
    case "$key" in ''|\#*) continue ;; esac
    eval "[ -n \"\${$key+x}\" ]" || eval "$key=\$value"
done < event.conf

EVENT_DATE="${EVENT_DATE:-2026-11-21T16:00:00-08:00}"
EVENT_END="${EVENT_END:-}"
MOVIE_START="${MOVIE_START:-}"
HISTORIC_DATE="${HISTORIC_DATE:-2025-11-15T18:00:00-08:00}"
SHOW_THANK_YOU_PAGE="${SHOW_THANK_YOU_PAGE:-false}"
TURNSTILE_SITE_KEY="${TURNSTILE_SITE_KEY:-}"
BUILD_VERSION="${BUILD_VERSION:-$(python3 -c "import json; print(json.load(open('package.json'))['version'])")}"
BUILD_SHA="${CF_PAGES_COMMIT_SHA:-${GITHUB_SHA:-local}}"
BUILD_SHA_SHORT=$(echo "$BUILD_SHA" | cut -c1-7)
BUILD_BRANCH="${CF_PAGES_BRANCH:-${GITHUB_REF_NAME:-local}}"

rm -rf "$OUT"
mkdir -p "$OUT"
cp -R index.html login.html thank-you.html invite.html robots.txt css js assets "$OUT"/

cat > "$OUT/config.js" <<EOF
window.EVENT_CONFIG = {
    eventDate: "${EVENT_DATE}",
    eventEnd: "${EVENT_END}",
    movieStart: "${MOVIE_START}",
    historicDate: "${HISTORIC_DATE}",
    showThankYouPage: ${SHOW_THANK_YOU_PAGE},
    turnstileSiteKey: "${TURNSTILE_SITE_KEY}",
    version: "${BUILD_VERSION}",
    sha: "${BUILD_SHA_SHORT}",
    branch: "${BUILD_BRANCH}"
};
EOF

# Patch title + link-preview date in the built pages.
# Date is formatted in EVENT_DATE's own UTC offset (no TZ database needed), so the
# result is the same on Cloudflare's UTC build machines and in the alpine container.
EVENT_LABEL=$(OUT="$OUT" EVENT_DATE="$EVENT_DATE" python3 - <<'PY'
import os, re, pathlib
from datetime import datetime
d = datetime.fromisoformat(os.environ["EVENT_DATE"])
n = d.day
suffix = "th" if 11 <= n % 100 <= 13 else {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
hour = d.hour % 12 or 12
new_dt = f"{d:%B} {n}{suffix}, {d.year} @ {hour}:{d:%M} {d:%p}"
for name in ("index.html", "login.html"):
    p = pathlib.Path(os.environ["OUT"]) / name
    html = p.read_text(encoding="utf-8")
    html = re.sub(r"Scott Pilgrim & Sandwich Day \d{4}", f"Scott Pilgrim & Sandwich Day {d.year}", html)
    html = re.sub(r"[A-Z][a-z]+ \d+(?:st|nd|rd|th), \d{4} @ \d{1,2}:\d{2} [AP]M", new_dt, html)
    p.write_text(html, encoding="utf-8")
print(new_dt)
PY
)

echo "Build complete: version=${BUILD_VERSION} sha=${BUILD_SHA_SHORT} branch=${BUILD_BRANCH} event=\"${EVENT_LABEL}\""
