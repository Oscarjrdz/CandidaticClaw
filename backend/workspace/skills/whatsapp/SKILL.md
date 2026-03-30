---
name: whatsapp
description: WhatsApp Business integration via Baileys. Receives and responds to WhatsApp messages, connects to existing gateway. Requires QR pairing setup on VPS.
user-invocable: true
metadata: { "openclaw": { "emoji": "💬", "status": "planned", "requires": { "env": ["WA_GATEWAY_URL"] }, "primaryEnv": "WA_GATEWAY_URL", "homepage": "https://docs.openclaw.ai/channels/whatsapp" } }
---

# WhatsApp — Baileys Gateway

Connects to the existing WhatsApp Baileys gateway running on the server.

## Status: 🔧 Planned

## Prerequisites
1. WhatsApp Gateway running on separate port (e.g., 3001)
2. QR code scan completed via `openclaw channels login --channel whatsapp`
3. `WA_GATEWAY_URL` env var set to gateway URL
4. `WA_GATEWAY_TOKEN` env var set (if gateway requires auth)

## Setup
```bash
# Set environment variables in PM2
pm2 restart candidatic-copilot \
  --update-env \
  WA_GATEWAY_URL=http://localhost:3001 \
  WA_GATEWAY_TOKEN=your_token
```

## Capabilities (once connected)
- Receive and respond to WhatsApp DMs
- Session memory per phone number
- Auto-retry on send failures
- Webhook receiver at `/api/openclaw/webhook`
