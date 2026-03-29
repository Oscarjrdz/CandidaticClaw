module.exports = {
  apps: [{
    name: "candidatic-copilot-daemon",
    script: "npx",
    args: "openclaw gateway", // Ejecuta de forma nativa el servidor
    watch: false,
    env: {
      OPENCLAW_CONFIG: "./openclaw.json",
      OPENCLAW_WORKSPACE: "./workspace",
      GOOGLE_API_KEY: "PON_TU_API_KEY_DE_GEMINI",
      OPENCLAW_PASSWORD: "PON_UNA_PASSWORD_AQUI_PARA_SEGURIDAD_WEB"
    }
  }]
}
