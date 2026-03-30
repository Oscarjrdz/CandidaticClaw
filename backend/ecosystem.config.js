module.exports = {
  apps: [{
    name: "candidatic-copilot-daemon",
    script: "node",
    args: "index.js",
    watch: false,
    env: {
      NODE_ENV: "production",
      PORT: 3000,
      VPS_API_KEY: "super_secret_key_123",   // <-- Cambia por un valor secreto real
      GOOGLE_API_KEY: "PON_TU_API_KEY_DE_GEMINI" // <-- OBLIGATORIO: tu API Key de Google AI Studio
    }
  }]
}
