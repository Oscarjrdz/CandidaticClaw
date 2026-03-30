---
name: datetime-aware
description: Real-time date and time awareness. Automatically injects the current date and time (Monterrey timezone) into every agent interaction, eliminating temporal confusion in responses.
user-invocable: false
metadata: { "openclaw": { "emoji": "⏰", "status": "active", "homepage": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat" } }
---

# DateTime Aware — Real-Time Temporal Context

Solves the problem of language models not knowing the current date/time.

## How it works
On every message, the current date and time is prepended to the system prompt:
```
Fecha y hora actual: domingo, 30 de marzo de 2026, 2:37 p.m.
```

## Configuration
- Timezone: `America/Monterrey` (CST/CDT)
- Format: Spanish, full date + short time
- Applied to: all channels (Telegram, WhatsApp, Dashboard)

## Notes
- No configuration needed — always active
- Zero latency overhead (no API calls)
- Fixes "what day is it?" type questions completely
