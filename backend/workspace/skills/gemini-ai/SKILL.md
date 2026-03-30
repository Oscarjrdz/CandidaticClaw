---
name: gemini-ai
description: Core AI reasoning via Google Gemini 2.0 Flash. Handles multi-turn conversation, contextual understanding, and intelligent responses for recruitment workflows.
user-invocable: true
metadata: { "openclaw": { "emoji": "🧠", "status": "active", "requires": { "env": ["GOOGLE_API_KEY"] }, "primaryEnv": "GOOGLE_API_KEY", "homepage": "https://ai.google.dev" } }
---

# Gemini AI — Core Intelligence

Uses Google Gemini 2.0 Flash as the primary LLM for all agent reasoning.

## Capabilities
- Multi-turn conversation with session memory (up to 20 turns)
- Contextual understanding of recruitment data
- Structured output for candidate evaluation
- Spanish/English bilingual by default

## Configuration
- Model: `gemini-2.0-flash`
- Session history: persisted per channel (Telegram, WhatsApp, Dashboard)
- System prompt: editable via Dashboard → System Prompt editor

## Usage
The agent automatically uses this skill for every incoming message across all channels.
