---
name: facebook-page
description: Facebook Page Manager via Graph API. Post content, read comments, respond to messages, and view Page analytics directly from OpenClaw. Requires Facebook Developer App and Page Access Token.
user-invocable: true
metadata: { "openclaw": { "emoji": "📘", "status": "planned", "requires": { "env": ["FB_PAGE_TOKEN", "FB_PAGE_ID"] }, "primaryEnv": "FB_PAGE_TOKEN", "homepage": "https://developers.facebook.com/docs/graph-api" } }
---

# Facebook Page — Graph API Manager

Manage your Facebook Page autonomously via the official Graph API.

## Status: 🔧 Pending Token

## Prerequisites
1. Facebook Developer account at developers.facebook.com
2. App created with "Business" type
3. Page Access Token with permissions:
   - `pages_manage_posts`
   - `pages_read_engagement`
   - `pages_show_list`
4. Page ID from Page Settings

## Setup
```bash
pm2 restart candidatic-copilot \
  --update-env \
  FB_PAGE_TOKEN=EAAxxxxxxxx \
  FB_PAGE_ID=123456789
```

## Capabilities (once configured)
- **Post** text/images to your Page feed
- **Read** comments and reactions
- **Reply** to comments automatically
- **View** Page insights (reach, engagement)
- **Moderate** content (hide/delete comments)
