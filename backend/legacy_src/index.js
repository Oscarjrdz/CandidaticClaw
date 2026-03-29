require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// API health endpoint for Dashboard
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', agent: 'Candidatic Copilot', mode: 'autonomous' });
});

// Importar el Motor Cognitivo
const { CopilotAgent } = require('./agent');

// 🎧 Gateway: Webhook WhatsApp interactivo
app.post('/webhook/whatsapp', async (req, res) => {
    // Ejemplo de payload: { sender: '+52...', message: 'Dime cuántos aplicaron' }
    const { sender, message } = req.body;
    
    if (!sender || !message) {
        return res.status(400).json({ error: 'Payload incompleto para WhatsApp Gateway' });
    }

    // Instanciar Sesión del Agente Exclusiva para ti
    const agent = new CopilotAgent(`WHATSAPP-${sender}`, 'WhatsApp');
    
    // Devolver un "200 OK" inmediato al Webhook de API Oficial o Twilio antes de procesar
    // (Opcionalmente, si es un long-poll, esperamos el resultado `reply`)
    
    const reply = await agent.processCommand(message);
    console.log(`[Twilio/WPP Send] -> "${reply}"`); // A futuro, aquí se inyectaría API externa

    res.json({ success: true, response_text: reply });
});

// 🎧 Gateway: Webhook Telegram interactivo
app.post('/webhook/telegram', async (req, res) => {
    const { chat_id, text } = req.body;
    
    if (!chat_id || !text) {
        return res.status(400).json({ error: 'Falta texto o chat_id de Telegram' });
    }

    const agent = new CopilotAgent(`TELEGRAM-${chat_id}`, 'Telegram');
    const reply = await agent.processCommand(text);

    console.log(`[Telegram Send] -> "${reply}"`);

    res.json({ success: true, response_text: reply });
});

// Start Daemon Server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`[Candidatic Copilot] 🧠 Cerebro Daemon running on port ${PORT}`);
});
