# scripts/

Helper scripts for development and demos.

## `tunnel.sh` — expose your local QVAC runtime to a deployed frontend

The Recuro merchant dashboard talks to a **QVAC AI runtime** over HTTP at `VITE_QVAC_BASE_URL`. By design, QVAC always runs on the merchant's own laptop — that's the privacy guarantee. But your **frontend** is deployed to Cloudflare Pages, so by default the browser would try to call `localhost:11434` from a public URL, which won't work.

This script bridges the two: ngrok exposes your local QVAC on a public HTTPS URL, you paste that URL into Cloudflare Pages env vars, and the deployed dashboard now talks to your laptop's QVAC instance.

```
   Browser (you, on a customer's laptop)
        │
        ▼
   https://<merchant>.pages.dev   ← Cloudflare Pages (always-on)
        │
        │ VITE_QVAC_BASE_URL
        ▼
   https://abcd-xx-xx.ngrok-free.app/v1   ← ngrok tunnel
        │
        ▼
   localhost:11434/v1   ← QVAC runtime running on YOUR laptop
```

### Tradeoff you're accepting

QVAC runs locally for privacy reasons. That means **the AI assistant only works while your laptop is on, awake, and online**. Closing the laptop kills the tunnel. There is no way around this with the current architecture — if you need 24/7 AI, you'd have to host QVAC on a server, which would defeat the local-first privacy model.

The rest of the dashboard (plans, subscribers, on-chain reads) keeps working when QVAC is offline; only the AI Chat feature goes dark.

---

### One-time setup

1. **Install ngrok**
   ```bash
   brew install ngrok/ngrok/ngrok        # macOS
   # or download: https://ngrok.com/download
   ```
2. **Sign up + auth** (free tier is fine): https://dashboard.ngrok.com/signup
   ```bash
   ngrok config add-authtoken <YOUR_TOKEN>
   ```

### Daily usage

1. **Start QVAC** in one terminal:
   ```bash
   qvac serve openai
   ```
2. **Open the tunnel** in another terminal:
   ```bash
   yarn tunnel
   # or:  ./scripts/tunnel.sh
   ```
3. The script prints a public URL like:
   ```
   Public URL : https://abcd-12-34-56-78.ngrok-free.app/v1
   ```
4. **Paste it into Cloudflare Pages** → your project → *Settings → Environment variables*:
   ```
   VITE_QVAC_BASE_URL = https://abcd-12-34-56-78.ngrok-free.app/v1
   ```
   Set it for both **Production** and **Preview**.
5. **Redeploy.** Vite bakes env vars at *build* time, so a redeploy is mandatory after changing them. Either click "Retry deployment" on the latest Cloudflare deployment or push any commit to your deploy branch.
6. **Allow your Cloudflare domain in `qvac.config.json`** (CORS):
   ```json
   {
     "serve": {
       "cors": {
         "enabled": true,
         "allowOrigins": [
           "http://localhost:8080",
           "https://<your-project>.pages.dev",
           "https://<your-custom-domain>"
         ]
       }
     }
   }
   ```
   Restart QVAC after editing.

That's it. Open your Cloudflare-deployed dashboard, click the AI Chat button — the green dot should be lit, signaling it reached your laptop's QVAC.

### Free-tier ngrok caveat

ngrok's free tier shows an interstitial browser warning the first time you open the tunnel URL in a browser. The dashboard sends the `ngrok-skip-browser-warning: true` header on every QVAC request, so this is bypassed automatically. (If you fork the dashboard, keep that header.)

### URL stability

The free-tier ngrok URL changes every restart. Each time you re-run `yarn tunnel`, you get a new URL → you have to update the Cloudflare env var and redeploy. Two ways to avoid the churn:

- **ngrok paid plan** ($8/mo) — gives you a stable static domain like `myname.ngrok.app`. Set Cloudflare's env var to that once, never touch it again.
- **Cloudflare Tunnel** (free, slightly more setup) — same idea, also gives you a stable URL: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/. Worth it if you'd rather not pay ngrok.

---

## Other targets (rare)

If you ever need to expose a *local frontend* publicly (sharing a WIP build with a teammate, debugging webhooks against `localhost`):

```bash
./scripts/tunnel.sh merchant     # localhost:8080  → public URL
./scripts/tunnel.sh user         # localhost:3000  → public URL
./scripts/tunnel.sh landing      # localhost:3002  → public URL
./scripts/tunnel.sh 4000         # arbitrary port  → public URL
```

For real 24/7 frontend deployment, use Cloudflare Pages / Vercel / Fly / Railway — ngrok is for ephemeral demos, not production.
