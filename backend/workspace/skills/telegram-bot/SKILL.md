---
name: telegram-bot
description: Telegram Bot integration via Long Polling (@CandidaticBot). Receives and sends messages, maintains per-chat session history, and routes all conversations through the Gemini AI skill.
user-invocable: true
metadata: { "openclaw": { "emoji": "📱", "status": "active", "requires": { "env": ["TELEGRAM_BOT_TOKEN"] }, "primaryEnv": "TELEGRAM_BOT_TOKEN", "homepage": "https://core.telegram.org/bots/api" } }
---

# Telegram Bot — @CandidaticBot

Connects OpenClaw to Telegram via Bot API with Long Polling (no HTTPS required).

## Capabilities
- Receive and respond to DMs and group messages
- Per-chat session memory (isolated from other channels)
- Typing indicator while processing
- Auto-chunking of long responses (4096 char limit)
- Retry logic on API failures (3 attempts with backoff)

## Configuration
- Bot username: `@CandidaticBot`
- Token: `TELEGRAM_BOT_TOKEN` environment variable
- Polling: `getUpdates` with 25s timeout
- Timezone: America/Monterrey (injected per message)

## Usage
Send any message to `@CandidaticBot` on Telegram. The agent will respond using the current System Prompt from `AGENTS.md`.
