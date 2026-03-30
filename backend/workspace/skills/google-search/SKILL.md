---
name: google-search
description: Real-time web search grounding via Google Search API. Enables the agent to answer questions with up-to-date information from the internet, including news, prices, and current events.
user-invocable: true
metadata: { "openclaw": { "emoji": "🌐", "status": "active", "requires": { "env": ["GOOGLE_API_KEY"] }, "primaryEnv": "GOOGLE_API_KEY", "homepage": "https://ai.google.dev/gemini-api/docs/grounding" } }
---

# Google Search — Real-Time Web Access

Enabled via Gemini's native Search Grounding feature. No additional API key required.

## Capabilities
- Live web search for factual questions
- Current news, exchange rates, sports scores
- Verifies information before responding
- Seamlessly integrated — model decides when to search

## How it works
Gemini automatically triggers a Google Search when the query requires real-time data.
Results are grounded into the response with source attribution.

## Notes
- Free tier: included with Gemini API access
- No separate Search API key needed
- Model decides autonomously when to use it
