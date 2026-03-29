const { GoogleGenerativeAI } = require('@google/generative-ai');
const { AgentMemory } = require('../memory/redis');

// Inicializado solo si existe la key en el .env
const genAI = process.env.GEMINI_API_KEY 
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) 
    : null;

class CopilotAgent {
    constructor(sessionId, channel) {
        this.sessionId = sessionId; // ej. WHATSAPP-+5255... o TELEGRAM-882...
        this.channel = channel; // 'WhatsApp' | 'Telegram'
        this.systemPrompt = `Eres Candidatic Copilot, el Ómni-agente y Gerente Operativo Privado de la agencia de reclutamiento.
Tu objetivo es ayudar directamente al CEO a administrar, filtrar y analizar candidatos rápidamente usando skills precisas.
Sé asertivo, extremadamente eficiente y no respondas con cortesías excesivas. El CEO tiene prisa.`;
        
        // El modelo recomendado para inferencias rápidas, soporte audio (vía multimodal nativo futuro) y function calling
        this.modelName = "gemini-1.5-flash"; 
    }

    /**
     * Motor principal: Recibe orden, asimila contexto usando Gemini y ejecuta skills.
     * @param {string} userInput - Texto transcrito o comando del CEO.
     */
    async processCommand(userInput) {
        if (!genAI) {
            return "[Error de Configuración] GEMINI_API_KEY no detectada. Por favor configura el Daemon.";
        }

        console.log(`[Copilot] 🧠 Procesando orden vía ${this.channel}: "${userInput.slice(0, 50)}..."`);
        
        // Configuramos la instancia del modelo incluyendo el System Prompt
        const model = genAI.getGenerativeModel({
            model: this.modelName,
            systemInstruction: this.systemPrompt,
        }, {
            apiVersion: 'v1beta' // Obligatorio para algunas features ultra avanzadas y systemInstructions robustas
        });
        
        // 1. Recuperar memoria persistente de sesión en Redis
        // En Redis lo guardamos agnóstico: { role: 'user' | 'assistant', content: '...' }
        let rawHistory = await AgentMemory.getHistory(this.sessionId);
        
        // 2. Traducción al formato nativo estricto de Gemini: { role: 'user' | 'model', parts: [{text: '...'}] }
        const historyForGemini = rawHistory.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        try {
            // 3. Restaurar la sesión de chat con el contexto previo
            const chat = model.startChat({ history: historyForGemini });

            // 4. Inferencia Cognitiva usando Gemini Flash
            const responseResult = await chat.sendMessage(userInput);
            const reply = responseResult.response.text();
            
            // 5. Guardar el nuevo estado mental estandarizado en Redis
            rawHistory.push({ role: 'user', content: userInput });
            rawHistory.push({ role: 'assistant', content: reply });
            await AgentMemory.saveHistory(this.sessionId, rawHistory);

            // Log gráfico del pensamiento (para inyectar al Dashboard)
            console.log(`[Copilot] 💡 Decisión: ${reply}`);

            // Retornamos el payload hacia el Webhook (WP/Telegram)
            return reply;

        } catch (error) {
            console.error(`[Copilot] 🚨 Critical Core Failure (Gemini SDK):`, error.message);
            return `Peligro Operativo: Circuitos saturados. No logré comunicarme con Gemini (${error.message}).`;
        }
    }
}

module.exports = { CopilotAgent };
