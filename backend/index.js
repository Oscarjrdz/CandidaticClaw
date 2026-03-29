import express from 'express';
import cors from 'cors';
import { OpenClaw } from 'openclaw';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.VPS_API_KEY || 'super_secret_key_123'; // Cambia esto por un entorno real

// Configuraciones de OpenClaw (Mock para la estructura)
// Se asume que OpenClaw maneja el estado interno, pero agregaremos flags para start/stop.
let agentActive = true;
let clientsSSE = []; // Para el Live Feed

// Middleware básicos
app.use(express.json());
app.use(cors({
  origin: '*', // En producción, restringir a tu dominio de Vercel (ej: 'https://midashboard.vercel.app')
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));

// Middleware de Autenticación para el Dashboard
const requireApiKey = (req, res, next) => {
  const key = req.headers['x-api-key'];
  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
  }
  next();
};

// ==========================================
// 1. OPENCLAW WEBHOOK (ENTRADA DESDE WHATSAPP)
// ==========================================
app.post('/api/openclaw/webhook', async (req, res) => {
  try {
    if (!agentActive) {
      return res.status(503).json({ status: 'agent_stopped', message: 'El agente Copilot está apagado.' });
    }

    const { candidateId, phone, message, candidateData } = req.body;
    
    // Broadcast al Live Feed
    broadcastSSE({
      type: 'log',
      level: 'info',
      message: `[Recepción] Mensaje de ${candidateData?.nombre || phone}: "${message}"`,
      timestamp: new Date().toISOString()
    });

    broadcastSSE({
      type: 'log',
      level: 'thinking',
      message: `[Thinking] Analizando currículum dinámico y fase del candidato (${candidateData?.fase})...`,
      timestamp: new Date().toISOString()
    });

    // Aquí inyectarías la lógica de OpenClaw
    // await copilotAgent.processMessage({ ... });
    
    res.status(200).json({ status: 'received' });
  } catch (error) {
    console.error('Error webhook:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ==========================================
// 2. DASHBOARD ADMIN ENDPOINTS
// ==========================================

// Iniciar Agente
app.post('/api/admin/start', requireApiKey, (req, res) => {
  agentActive = true;
  broadcastSSE({ type: 'sys', message: '[System] 🟢 Agente INICIADO', timestamp: new Date().toISOString() });
  res.json({ status: 'success', agentActive });
});

// Detener Agente (Kill Switch)
app.post('/api/admin/stop', requireApiKey, (req, res) => {
  agentActive = false;
  broadcastSSE({ type: 'sys', message: '[System] 🔴 Agente DETENIDO (Kill Switch activado)', timestamp: new Date().toISOString() });
  res.json({ status: 'success', agentActive });
});

// Consultar Estadísticas
app.get('/api/admin/stats', requireApiKey, (req, res) => {
  res.json({
    status: 'success',
    data: {
      agentActive,
      activeConversations: 12, // Mock, reemplazar con DB o memoria de OpenClaw
      messagesToday: 345,
      candidatesTransferred: 3
    }
  });
});

// Consultar Conversaciones Activas
app.get('/api/admin/conversations', requireApiKey, (req, res) => {
  res.json({
    status: 'success',
    data: [
      { id: '1', phone: '528112345678', name: 'Juan Pérez', status: 'Analizando', lastUpdate: new Date().toISOString() },
      { id: '2', phone: '1234567890', name: 'María Gómez', status: 'Esperando Respuesta', lastUpdate: new Date(Date.now() - 50000).toISOString() },
      { id: '3', phone: '0987654321', name: 'Carlos Díaz', status: 'Transferido a Humano', lastUpdate: new Date(Date.now() - 300000).toISOString() },
    ]
  });
});

// Leer y Actualizar System Prompt en caliente (AGENTS.md)
const agentsFilePath = path.join(__dirname, 'workspace', 'AGENTS.md');
app.get('/api/admin/prompt', requireApiKey, (req, res) => {
  try {
    const prompt = fs.existsSync(agentsFilePath) ? fs.readFileSync(agentsFilePath, 'utf8') : '';
    res.json({ status: 'success', data: { prompt } });
  } catch (error) {
    res.status(500).json({ error: 'Error leyendo AGENTS.md' });
  }
});

app.put('/api/admin/prompt', requireApiKey, (req, res) => {
  try {
    const { prompt } = req.body;
    fs.writeFileSync(agentsFilePath, prompt, 'utf8');
    broadcastSSE({ type: 'sys', message: '[System] ⚠️ System Prompt Actualizado en caliente.', timestamp: new Date().toISOString() });
    res.json({ status: 'success', message: 'Prompt actualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Error guardando AGENTS.md' });
  }
});

// ==========================================
// 3. SERVER-SENT EVENTS (SSE) - LIVE FEED
// ==========================================
app.get('/api/admin/feed', (req, res) => {
  // Para SSE usamos query params o permitimos sin token para simplificar la conexión de EventSource.
  // En producción real, puedes enviar el token en un query param: ?token=API_KEY
  const token = req.query.token;
  if (token !== API_KEY) {
    return res.status(401).end();
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Enviar mensaje inicial
  res.write(`data: ${JSON.stringify({ type: 'sys', message: '[System] 🔌 Conectado al Live Feed de Copilot...', timestamp: new Date().toISOString() })}\n\n`);

  // Agregar a la lista de clientes activos
  clientsSSE.push(res);

  // Manejar desconexión
  req.on('close', () => {
    clientsSSE = clientsSSE.filter(client => client !== res);
  });
});

// Función helper para emitir a todos los clientes conectados
function broadcastSSE(data) {
  clientsSSE.forEach(client => {
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  });
}

// ==========================================
// INICIO DEL SERVIDOR
// ==========================================
app.listen(PORT, () => {
  console.log(`🚀 Copilot Backend Server escuchando en http://localhost:${PORT}`);
});
