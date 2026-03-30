---
name: browser-control
description: Headless Chromium browser running on the VPS via Playwright. Enables OpenClaw to navigate websites, extract data, fill forms, and interact with any web page autonomously — no Mac required.
user-invocable: true
metadata: { "openclaw": { "emoji": "🌐", "status": "active", "requires": { "bins": ["chromium"] }, "homepage": "https://playwright.dev" } }
---

# Browser Control — Headless Chromium (VPS)

Playwright-powered headless browser running 24/7 on the DigitalOcean VPS.

## Capabilities
- **Navigate** any URL (HTTP/HTTPS)
- **Extract text** from any web page
- **Click** buttons and links
- **Type** text into forms
- **Execute JS** on the page
- **Screenshot** (base64 PNG)

## API Endpoint
`POST /api/admin/browser`

```json
{
  "url": "https://example.com",
  "actions": [
    { "type": "getPageText" },
    { "type": "click", "selector": "#button" },
    { "type": "type", "selector": "#input", "text": "hola" },
    { "type": "screenshot" }
  ]
}
```

## Use Cases
- Scrape job boards for candidate data
- Check competitor pricing or listings
- Post to Facebook Pages (with session cookies)
- Monitor websites for changes
- Extract LinkedIn profiles

## Configuration
- Engine: Playwright Chromium Headless Shell v1208
- VPS: DigitalOcean SFO3
- RAM: ~80MB per session
- Session: stateless (no cookies persisted between calls)

## Notes
- Uses `--no-sandbox` flag (required on Linux VPS)
- Pages with heavy JS may need `{ "type": "wait", "ms": 2000 }` after navigation
- For Facebook/LinkedIn: session cookies required (bring-your-own-cookies)
