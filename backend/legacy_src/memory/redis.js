const Redis = require('ioredis');

// Asumiendo que Redis correrá localmente o en un servicio (ej. Upstash)
const client = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

client.on('connect', () => {
    console.log('[Memory] 🟢 Conectado exitosamente a Redis');
});

client.on('error', (err) => {
    console.error('[Memory] 🔴 Error conectando a Redis:', err);
});

class AgentMemory {
    /**
     * Guarda el historial de conversación en Redis.
     * @param {string} sessionId - ID único (ej. número de WhatsApp o Telegram ID)
     * @param {Array} history - Array de mensajes [{ role: 'user', content: '...' }]
     */
    static async saveHistory(sessionId, history) {
        // Expiramos el contexto después de 24 horas si no hay actividad
        await client.set(`copilot:history:${sessionId}`, JSON.stringify(history), 'EX', 86400);
    }

    /**
     * Recupera el historial de conversación.
     * @param {string} sessionId
     * @returns {Promise<Array>}
     */
    static async getHistory(sessionId) {
        const data = await client.get(`copilot:history:${sessionId}`);
        return data ? JSON.parse(data) : [];
    }

    /**
     * Limpia la memoria de un usuario específico.
     */
    static async clearMemory(sessionId) {
        await client.del(`copilot:history:${sessionId}`);
    }
}

module.exports = { client, AgentMemory };
