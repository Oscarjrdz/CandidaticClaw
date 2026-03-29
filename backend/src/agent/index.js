const { OpenAI } = require('openai');
const { AgentMemory } = require('../memory/redis');

// Inicializado solo si existe la key en el .env
const openai = process.env.OPENAI_API_KEY 
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) 
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
        if (!openai) {
            return "[Error de Configuración] OPENAI_API_KEY no detectada. Por favor configura el Daemon.";
        }

        console.log(`[Copilot] 🧠 Procesando orden vía ${this.channel}: "${userInput.slice(0, 50)}..."`);
        
        // 1. Recuperar memoria persistente de sesión y agregar prompt root
        let history = await AgentMemory.getHistory(this.sessionId);
        
        // Inyectar System Prompt como primer mensaje (Developer message para o1/gpt-4o)
        const messages = [
            { role: 'developer', content: this.systemPrompt },
            ...history,
            { role: 'user', content: userInput }
        ];

        try {
            // 2. Inferencia Cognitiva usando GPT-4o
            const response = await openai.chat.completions.create({
                model: 'gpt-4o',
                max_tokens: 1024,
                temperature: 0.1, // Respuestas lógicas y directas, cero alucinaciones 
                messages: messages
            });

            const reply = response.choices[0].message.content;
            
            // 3. Guardar estado mental en Redis (excluyendo el developer prompt)
            history.push({ role: 'user', content: userInput });
            history.push({ role: 'assistant', content: reply });
            await AgentMemory.saveHistory(this.sessionId, history);

            // Log gráfico del pensamiento
            console.log(`[Copilot] 💡 Decisión: ${reply}`);

            return reply;

        } catch (error) {
            console.error(`[Copilot] 🚨 Critical Core Failure:`, error.message);
            return `Peligro Operativo: Circuitos saturados. Error interno en el cerebro (${error.message}).`;
        }
    }
}

module.exports = { CopilotAgent };
