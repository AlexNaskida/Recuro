#!/usr/bin/env bash
# tunnel.sh — expose your local QVAC runtime via ngrok so a deployed
# (Cloudflare / Vercel / etc.) Recuro frontend can talk to it.
#
# Default usage:
#   ./scripts/tunnel.sh                 # tunnels QVAC on port 11434
#   yarn tunnel                         # same, via the package.json alias
#
# Other targets (only useful if you also want to expose a local frontend):
#   ./scripts/tunnel.sh merchant        # merchant-dashboard (port 8080)
#   ./scripts/tunnel.sh user            # user-demo         (port 3000)
#   ./scripts/tunnel.sh landing         # landing           (port 3002)
#   ./scripts/tunnel.sh 4000            # arbitrary port
#
# Requirements:
#   - ngrok installed (brew install ngrok/ngrok/ngrok  OR  https://ngrok.com/download)
#   - ngrok authtoken configured once: ngrok config add-authtoken <token>

set -euo pipefail

# ── 1. Resolve target port ────────────────────────────────────────────────────
TARGET="${1:-qvac}"
PATH_SUFFIX=""
case "$TARGET" in
  qvac|ai|model)                         PORT=11434; APP="QVAC runtime";       PATH_SUFFIX="/v1"; DEV_CMD="qvac serve openai" ;;
  merchant|merchant-dashboard|dashboard) PORT=8080;  APP="merchant-dashboard"; DEV_CMD="yarn dev:merchant" ;;
  user|user-demo|demo)                   PORT=3000;  APP="user-demo";          DEV_CMD="yarn dev:user" ;;
  landing|website)                       PORT=3002;  APP="landing";            DEV_CMD="yarn dev:landing" ;;
  ''|*[!0-9]*)
    echo "Unknown target: '$TARGET'"
    echo "Use one of: qvac (default) | merchant | user | landing | <port-number>"
    exit 1
    ;;
  *)                                     PORT="$TARGET"; APP="port $TARGET"; DEV_CMD="(your dev server on port $TARGET)" ;;
esac

# ── 2. Pre-flight checks ──────────────────────────────────────────────────────
if ! command -v ngrok >/dev/null 2>&1; then
  cat <<EOF
✗ ngrok is not installed.

Install it with one of:
  brew install ngrok/ngrok/ngrok          # macOS (Homebrew)
  https://ngrok.com/download              # any platform

Then sign up at https://dashboard.ngrok.com/signup (free tier is fine), grab
your authtoken, and run once:
  ngrok config add-authtoken <YOUR_TOKEN>

Then re-run this script.
EOF
  exit 1
fi

# Check that something is actually listening on the target port
if ! lsof -iTCP:"$PORT" -sTCP:LISTEN -P -n >/dev/null 2>&1; then
  cat <<EOF
⚠  Nothing is listening on port $PORT yet.

Open a second terminal and start your service first:
  $DEV_CMD

Then re-run this script.
EOF
  exit 1
fi

# ── 3. Start ngrok in the background and capture the public URL ──────────────
echo "→ Starting ngrok tunnel to localhost:$PORT ($APP)…"

LOG_FILE="$(mktemp -t ngrok.XXXXXX.log)"
ngrok http "$PORT" --log=stdout --log-format=json >"$LOG_FILE" 2>&1 &
NGROK_PID=$!

cleanup() {
  echo ""
  echo "→ Closing tunnel (pid $NGROK_PID)…"
  kill "$NGROK_PID" 2>/dev/null || true
  rm -f "$LOG_FILE"
}
trap cleanup EXIT INT TERM

PUBLIC_URL=""
for _ in $(seq 1 30); do
  sleep 0.5
  PUBLIC_URL="$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null \
    | grep -oE '"public_url":"https://[^"]+"' \
    | head -n 1 \
    | sed -E 's/.*"public_url":"([^"]+)".*/\1/')"
  [ -n "$PUBLIC_URL" ] && break
done

if [ -z "$PUBLIC_URL" ]; then
  echo "✗ Failed to acquire ngrok URL within 15s. Check $LOG_FILE for errors."
  exit 1
fi

FULL_URL="${PUBLIC_URL}${PATH_SUFFIX}"

# ── 4. Print URL + setup steps for Cloudflare-hosted frontend ────────────────
if [ "$TARGET" = "qvac" ] || [ "$TARGET" = "ai" ] || [ "$TARGET" = "model" ]; then
  cat <<EOF

╭──────────────────────────────────────────────────────────────────────╮
│  ✓ QVAC tunnel is live                                               │
│                                                                      │
│  Public URL : $FULL_URL
│  Forwards   : localhost:$PORT  ($APP)
│  Inspector  : http://127.0.0.1:4040                                  │
╰──────────────────────────────────────────────────────────────────────╯

To point your Cloudflare-deployed dashboard at this QVAC instance:

  1. In Cloudflare Pages → your project → Settings → Environment variables,
     set (for both Production and Preview):

        VITE_QVAC_BASE_URL = $FULL_URL

  2. Redeploy (Cloudflare Pages → Deployments → "Retry deployment", or push
     any commit). Vite env vars are baked at build time — a redeploy is
     mandatory after changing them.

  3. Allow your Cloudflare domain in qvac.config.json so CORS lets the
     browser hit this tunnel:

        "allowOrigins": [
          "http://localhost:8080",
          "https://<your-project>.pages.dev",
          "https://<your-custom-domain>"
        ]

     Then restart QVAC so it picks up the new config.

  4. (Free ngrok tier only) the first request from a browser shows an
     interstitial warning page. To bypass it, the dashboard sends the
     header 'ngrok-skip-browser-warning' on every QVAC request — this
     is already wired up in client/apps/merchant-dashboard. If you've
     forked the dashboard, make sure that header is present on fetches.

⚠  Reminder: this URL only works while THIS terminal is open and your
   laptop is awake + online. The QVAC runtime is supposed to be local
   (privacy by design) — that's fine. But the tradeoff is the merchant's
   AI assistant only works while their laptop is on. There is no way
   around this with the current architecture.

Press Ctrl+C to close the tunnel.
EOF
else
  cat <<EOF

╭──────────────────────────────────────────────────────────────────────╮
│  ✓ Tunnel is live                                                    │
│                                                                      │
│  Public URL : $PUBLIC_URL
│  Forwards   : localhost:$PORT  ($APP)
│  Inspector  : http://127.0.0.1:4040                                  │
╰──────────────────────────────────────────────────────────────────────╯

⚠  Reminder: ngrok is NOT hosting. URL only works while this terminal
   stays open and your laptop is awake + online. For 24/7 frontend
   deployment use Cloudflare Pages / Vercel / Fly / Railway.

Press Ctrl+C to close the tunnel.
EOF
fi

# ── 5. Wait on ngrok so the tunnel stays up until Ctrl+C ─────────────────────
wait "$NGROK_PID"
