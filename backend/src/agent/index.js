const { Anthropic } = require('@anthropic-ai/sdk');
const { AgentMemory } = require('../memory/redis');

// Inicializado solo si existe la key en el .env
const anthropic = process.env.ANTHROPIC_API_KEY 
    ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) 
    : null;

class CopilotAgent {
    constructor(sessionId, channel) {
        this.sessionId = sessionId; // ej. WhatsApp-555... o Telegram-882...
        this.channel = channel; // 'WhatsApp' | 'Telegram'
        this.systemPrompt = `Eres Candidatic Copilot, el Ómni-agente y Gerente Operativo Privado de la agencia de reclutamiento.
Tu objetivo es ayudar directamente al CEO a administrar, filtrar y analizar candidatos rápidamente usando skills precisas.
Sé asertivo, extremadamente eficiente y no respondas con cortesías excesivas. El CEO tiene prisa.`;
    }

    /**
     * Motor principal: Recibe orden, analiza contexto y ejecuta skills (herramientas).
     * @param {string} userInput - Texto o transcripción de audio.
     */
    async processCommand(userInput) {
        if (!anthropic) {
            return "[Error de Configuración] ANTHROPIC_API_KEY no detectada. Por favor configura el Daemon.";
        }

        console.log(`[Copilot] 🧠 Procesando orden vía ${this.channel}: "${userInput.slice(0, 50)}..."`);
        
        // 1. Recuperar memoria persistente de sesión
        let history = await AgentMemory.getHistory(this.sessionId);
        history.push({ role: 'user', content: userInput });

        try {
            // 2. Inferencia Cognitiva usando Claude 3.5
            // Nota: Aquí luego inyectaremos el array de `tools` para que llame directamente a CandidaticDb
            const response = await anthropic.messages.create({
                model: 'claude-3-5-sonnet-latest',
                max_tokens: 1024,
                temperature: 0.1, // Respuestas lógicas y directas, cero halucinaciones 
                system: this.systemPrompt,
                messages: history
            });

            const reply = response.content[0].text;
            
            // 3. Guardar estado mental
            history.push({ role: 'assistant', content: reply });
            await AgentMemory.saveHistory(this.sessionId, history);

            // Log gráfico del pensamiento (ideal para enviarlo vía /api al Dashboard)
            console.log(`[Copilot] 💡 Decisión: ${reply}`);

            // Retornamos el payload que se le enviará de regreso por WP/Telegram
            return reply;

        } catch (error) {
            console.error(`[Copilot] 🚨 Critical Core Failure:`, error.message);
            return `Peligro Operativo: Circuitos saturados. Error interno en el cerebro (${error.message}).`;
        }
    }
}

module.exports = { CopilotAgent };
