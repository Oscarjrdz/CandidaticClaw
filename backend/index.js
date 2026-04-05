import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { publishViaPuppeteer, getFacebookGroups, publishToGroups, getProfileFeed, getFacebookNotifications, getFacebookActivityLog } from './facebook-automator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ── Credenciales ────────────────────────────────────────────────────────────
const API_KEY            = process.env.VPS_API_KEY        || 'super_secret_key_123';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_API       = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
// URL pública de este VPS (para registrar el webhook de Telegram)
const VPS_PUBLIC_URL     = process.env.VPS_PUBLIC_URL     || `http://64.23.180.202:${PORT}`;
// URL del Gateway WhatsApp Baileys (tu gateway existente)
const WA_GATEWAY_URL     = process.env.WA_GATEWAY_URL     || 'http://localhost:3001';
const WA_GATEWAY_TOKEN   = process.env.WA_GATEWAY_TOKEN   || '';

// ── Estado global ───────────────────────────────────────────────────────────
let agentActive  = true;
let clientsSSE   = [];
const chatSessions = new Map(); // historial por sessionId

// Contadores reales de actividad
const stats = {
  messagesToday: 0,
  candidatesTransferred: 0,
  telegramActive: 0,
  whatsappActive: 0,
};

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
}));

// Auth middleware para rutas de admin
const requireApiKey = (req, res, next) => {
  const key = req.headers['x-api-key'];
  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
  }
  next();
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const agentsFilePath = path.join(__dirname, 'workspace', 'AGENTS.md');

function getSystemPrompt() {
  return fs.existsSync(agentsFilePath)
    ? fs.readFileSync(agentsFilePath, 'utf8')
    : 'Eres un agente de contratación autónomo llamado OpenClaw. Ayuda a candidatos y reclutadores de forma profesional.';
}

// Detecta si el mensaje requiere navegar y enriquece el contexto
async function enrichWithBrowser(userMessage) {
  const urlMatch = userMessage.match(/https?:\/\/[^\s]+/);
  const sitePatterns = [
    { regex: /milenio\.com/i, url: 'https://www.milenio.com' },
    { regex: /expansion\.mx/i, url: 'https://expansion.mx' },
    { regex: /infobae\.com/i, url: 'https://www.infobae.com/mexico' },
    { regex: /elfinanciero/i, url: 'https://www.elfinanciero.com.mx' },
    { regex: /eleconomista/i, url: 'https://www.eleconomista.com.mx' },
    { regex: /elnorte\.com|elnorte|el norte/i, url: 'https://www.elnorte.com' },
    { regex: /reforma/i, url: 'https://www.reforma.com' }
  ];
  
  const hasBrowseIntent = /vis[ií]ta|ve a|navega|abre|entra a|dame.*not|noticias.*hoy/i.test(userMessage);
  if (!hasBrowseIntent && !urlMatch) return null;

  let targetUrl = urlMatch ? urlMatch[0] : null;
  if (!targetUrl) {
    for (const { regex, url } of sitePatterns) {
      if (regex.test(userMessage)) { targetUrl = url; break; }
    }
  }
  if (!targetUrl) return null;

  try {
    const { runBrowserTask } = await import('./browser-worker.js');
    const result = await runBrowserTask({ url: targetUrl, actions: [{ type: 'getMetadata' }, { type: 'getPageText' }], useCache: true });
    
    const text = result.results.find(r => r.action === 'getPageText')?.text || '';
    if (text.includes('403') || text.includes('Request blocked') || text.includes('CloudFront') || text.length < 100) {
      console.log('[AutoBrowse] Sitio bloqueó VPS, Gemini usará Google Search');
      return null;
    }
    
    const meta = result.metadata || {};
    return `[CONTEXTO WEB REAL — ${targetUrl} — ${new Date().toLocaleString('es-MX')}]\nTítulo: ${meta.title || ''}\n${text.slice(0, 5000)}\n[FIN CONTEXTO WEB — responde basándote solo en este contenido real]`;
  } catch (e) {
    console.error('[AutoBrowse]', e.message);
    return null;
  }
}

// Genera una imagen usando motor alternativo libre (Pollinations AI) ante el bloqueo de Google
async function generateImageWithGemini(prompt) {
  try {
    console.log('[Motor Imagen] Generando arte para:', prompt);
    // Usamos pollinations.ai, un motor estable sin bloqueo regional ni costo
    const safePrompt = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${safePrompt}?width=1080&height=1080&nologo=true`;
    
    console.log('[Motor Imagen] Consultando:', url);
    const res = await fetch(url);
    if (!res.ok) {
      console.error("[Motor Imagen Error HTTP]", res.status);
      return null;
    }
    
    // Convertir el buffer de la imagen directamente a Base64 para enviarlo a Make.com
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString('base64');
  } catch (e) {
    console.error("[Motor Imagen Exception]", e.message);
    return null;
  }
}

// Procesa un mensaje con Gemini (texto/imagen) y devuelve la respuesta
async function processWithAgent(userMessage, sessionKey = 'default', imagePart = null) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_API_KEY no configurada');

  const tools = [{
      functionDeclarations: [
        {
          name: "publishToFacebook",
          description: "Publica texto en la página de Facebook directamente usando automatización nativa (Puppeteer) en el servidor. (Nota: actualmente solo soporta texto).",
          parameters: {
            type: "OBJECT",
            properties: {
              message: { type: "STRING" },
              imageUrl: { type: "STRING", description: "Opcional. URL de foto." },
              articleUrl: { type: "STRING", description: "Opcional. URL de una nota, blog o sitio destino. Si se proporciona, esta URL aparecerá en rojo/azul y generará la tarjeta de previsualización (Link Post) en Facebook." },
              scheduleTime: { type: "STRING", description: "Opcional. Fecha y hora EXACTA en formato estricto ISO 8601 (ej: '2026-03-31T17:15:00Z') calculada a partir de la hora actual. Indispensable para programaciones." },
              imageGenerationPrompt: { type: "STRING", description: "Opcional. Si el usuario pide generar/clonar una foto o flyer, escribe aquí las instrucciones visuales súper detalladas en INGLÉS para que la IA (Imagen 3) dibuje la foto nueva (ej: 'A high quality product shot of a black nike shoe on a neon cyberpunk background')." }
            },
            required: ["message"]
          }
        },
        {
          name: "searchWeb",
          description: "Busca noticias recientes o información en internet (DuckDuckGo/Google) para obtener datos reales en vivo sin alucinar.",
          parameters: {
            type: "OBJECT",
            properties: {
              query: { type: "STRING", description: "La búsqueda a realizar (ej: 'Noticias principales de elnorte.com hoy')" }
            },
            required: ["query"]
          }
        },
        {
          name: "listFacebookGroups",
          description: "Navega a facebook.com y extrae en vivo la lista real de todos los grupos a los que la cuenta está unida. Úsalo si el usuario quiere 'saber, listar, ver o analizar' en qué grupos está.",
          parameters: { type: "OBJECT", properties: {} }
        },
        {
          name: "publishInFacebookGroups",
          description: "Publica un texto específico en uno o más grupos de Facebook. Requiere los IDs de los grupos (que puedes obtener listando los grupos primero).",
          parameters: {
            type: "OBJECT",
            properties: {
              groupIds: { type: "ARRAY", items: { type: "STRING" }, description: "Arreglo con los IDs numéricos de los grupos objetivo." },
              message: { type: "STRING", description: "El texto exacto de la publicación." }
            },
            required: ["groupIds", "message"]
          }
        },
        {
          name: "readFacebookFeed",
          description: "Entra a tu propio perfil de Facebook (Timeline/Dashboard) de manera nativa y lee los últimos posts para ver métricas de interacciones (Likes, Comentarios, Compartidas) y el texto. Úsalo cuando te pidan 'ver nuestro feed' o revisar cómo van las publicaciones recientes.",
          parameters: {
            type: "OBJECT",
            properties: {
              limit: { type: "INTEGER", description: "Cantidad de publicaciones a raspar (ej: 5)." }
            }
          }
        },
        {
          name: "readFacebookNotifications",
          description: "Entra a Facebook y extrae tus notificaciones más recientes (comentarios, likes, aprobaciones de grupos). Úsalo para dar seguimiento ultra recuente.",
          parameters: {
            type: "OBJECT",
            properties: {
              limit: { type: "INTEGER", description: "Cantidad máxima de notificaciones a leer (recomendado: 10)." }
            }
          }
        },
        {
          name: "readFacebookActivityLog",
          description: "Abre el Registro de Actividad de tu perfil para investigar si las publicaciones recientes pasaron los filtros administrativos (verificar que se compartieron enlaces en grupos con éxito). Da un audit trail.",
          parameters: {
            type: "OBJECT",
            properties: {
              limit: { type: "INTEGER", description: "Cantidad máxima de entradas del log (recomendado: 10)." }
            }
          }
        }
      ]
  }];

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: getSystemPrompt(),
    tools
  });

  if (!chatSessions.has(sessionKey)) chatSessions.set(sessionKey, []);
  const history = chatSessions.get(sessionKey);

  const chat = model.startChat({ history });

  const webContext = await enrichWithBrowser(userMessage).catch(() => null);
  const finalMessage = webContext ? `${webContext}\n\nPregunta: ${userMessage}` : userMessage;

  let msgPayload = finalMessage;
  if (imagePart) {
      msgPayload = [ { text: finalMessage }, imagePart ];
  }

  let result = await chat.sendMessage(msgPayload);
  
  const functionCalls = result.response.functionCalls();
  if (functionCalls && functionCalls.length > 0) {
    const call = functionCalls[0];
    
    if (call.name === 'searchWeb') {
      const q = call.args.query;
      let searchRes = "[BÚSQUEDA FALLIDA]";
      try {
        const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=es-MX&gl=MX&ceid=MX:es-419`;
        const resp = await fetch(url);
        const xml = await resp.text();
        const items = [...xml.matchAll(/<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<pubDate>(.*?)<\/pubDate>[\s\S]*?<\/item>/g)].slice(0, 10);
        
        if (items.length > 0) {
           const newsList = items.map(m => `- ${m[1]} (${new Date(m[2]).toLocaleString('es-MX')})`).join('\n');
           searchRes = `[NOTICIAS Y TITULARES REALES RECIENTES PARA "${q}"]\n\n${newsList}`;
        } else {
           searchRes = `[No hay noticias recientes de "${q}", usa otra combinación de palabras o diles que no hay datos nuevos.]`;
        }
      } catch(e) { searchRes = "[Error de red buscando en internet]"; }
      
      result = await chat.sendMessage([{ functionResponse: { name: "searchWeb", response: { result: searchRes } } }]);
    }
    else if (call.name === 'publishToFacebook') {
      const fbMsg = call.args.message;
      let fbRes = "[INICIANDO POSTEO NATIVO...]";
      
      try {
        console.log(`[Facebook] Agente solicitó publicar: ${fbMsg}`);
        // Llamada directa a nuestro script nativo. Enviamos un objeto destructurado.
        const resultAutomator = await publishViaPuppeteer({ message: fbMsg });
        fbRes = resultAutomator; // "[POST PUBLICADO EXITOSAMENTE]" o el error respectivo
      } catch(e) { 
        fbRes = `[ERROR FATAL PUBLICANDO: ${e.message}]`; 
      }
      
      result = await chat.sendMessage([{ functionResponse: { name: "publishToFacebook", response: { result: fbRes } } }]);
    }
    else if (call.name === 'listFacebookGroups') {
      let fbRes = "[INICIANDO EXTRACCIÓN DE GRUPOS...]";
      try {
        console.log(`[Facebook] Agente solicitó extraer grupos...`);
        const grupos = await getFacebookGroups();
        
        if (grupos.length === 0) {
           fbRes = "[FB ADMIN] La extracción terminó, pero se detectaron 0 grupos. ¿La cuenta es nueva o hay un problema de interfaz?";
        } else {
           const lista = grupos.map((g, i) => `${i+1}. ${g.name} (URL: ${g.url})`).join("\n");
           fbRes = `[FB ADMIN] ÉXITO. Se encontraron ${grupos.length} grupos.\nListado completo:\n${lista}`;
        }
      } catch(e) {
        fbRes = `[ERROR FATAL EXTRAYENDO GRUPOS: ${e.message}]`;
      }
      result = await chat.sendMessage([{ functionResponse: { name: "listFacebookGroups", response: { result: fbRes } } }]);
    }
    else if (call.name === 'publishInFacebookGroups') {
      const { groupIds, message } = call.args;
      let fbRes = "";
      try {
        console.log(`[Facebook] Agente solicitó publicar en ${groupIds.length} grupos.`);
        fbRes = await publishToGroups(groupIds, message);
      } catch(e) {
        fbRes = `[ERROR FATAL PUBLICANDO EN GRUPOS: ${e.message}]`;
      }
      result = await chat.sendMessage([{ functionResponse: { name: "publishInFacebookGroups", response: { result: fbRes } } }]);
    }
    else if (call.name === 'readFacebookFeed') {
      const limit = call.args.limit || 5;
      let fbRes = "";
      try {
        console.log(`[Facebook] Agente solicitó leer el feed de perfil (limite: ${limit}).`);
        const posts = await getProfileFeed(limit);
        fbRes = JSON.stringify(posts, null, 2);
      } catch(e) {
        fbRes = `[ERROR FATAL EXTRACCION DE FEED: ${e.message}]`;
      }
      result = await chat.sendMessage([{ functionResponse: { name: "readFacebookFeed", response: { result: fbRes } } }]);
    }
    else if (call.name === 'readFacebookNotifications') {
      const limit = call.args.limit || 10;
      let fbRes = "";
      try {
        console.log(`[Facebook] Agente solicitó leer notificaciones (limite: ${limit}).`);
        const notifs = await getFacebookNotifications(limit);
        fbRes = JSON.stringify(notifs, null, 2);
      } catch(e) {
        fbRes = `[ERROR FATAL LEYENDO NOTIFICACIONES: ${e.message}]`;
      }
      result = await chat.sendMessage([{ functionResponse: { name: "readFacebookNotifications", response: { result: fbRes } } }]);
    }
    else if (call.name === 'readFacebookActivityLog') {
      const limit = call.args.limit || 10;
      let fbRes = "";
      try {
        console.log(`[Facebook] Agente solicitó leer Registro de Actividad (limite: ${limit}).`);
        const log = await getFacebookActivityLog(limit);
        fbRes = JSON.stringify(log, null, 2);
      } catch(e) {
        fbRes = `[ERROR FATAL LEYENDO REGISTRO ACTIVIDAD: ${e.message}]`;
      }
      result = await chat.sendMessage([{ functionResponse: { name: "readFacebookActivityLog", response: { result: fbRes } } }]);
    }
  }

  const reply = result.response.text();

  history.push({ role: 'user',  parts: imagePart ? [{ text: userMessage }, imagePart] : [{ text: userMessage }] });
  history.push({ role: 'model', parts: [{ text: reply }] });
  if (history.length > 40) history.splice(0, history.length - 40);

  stats.messagesToday++;
  return reply;
}

// Procesa imagen + texto con Gemini Vision (Redireccionando a la red principal)
async function processWithAgentVision(imageBase64, mimeType, caption, sessionKey = 'default') {
  const prompt = caption || 'Analiza detalladamente esta imagen en español e identifica todos los elementos visuales que la componen para clonarla o inspirarnos en ella.';
  const imagePart = { inlineData: { data: imageBase64, mimeType } };
  return await processWithAgent(prompt, sessionKey, imagePart);
}

// Divide texto largo en chunks (Telegram max 4096, WhatsApp ~65536)
function chunkText(text, maxLen = 4096) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    // Intentar cortar en párrafo o salto de línea
    let end = Math.min(i + maxLen, text.length);
    if (end < text.length) {
      const cut = text.lastIndexOf('\n\n', end);
      if (cut > i) end = cut;
    }
    chunks.push(text.slice(i, end).trim());
    i = end;
  }
  return chunks.filter(Boolean);
}

// ── TELEGRAM ─────────────────────────────────────────────────────────────────

async function sendTelegramMessage(chatId, text, retries = 3) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('[Telegram] TELEGRAM_BOT_TOKEN no configurado');
    return;
  }
  const chunks = chunkText(text, 4096);
  for (const chunk of chunks) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: chunk, parse_mode: 'Markdown' }),
        });
        if (!res.ok) {
          const err = await res.json();
          // Si el error es de formato Markdown, reintenta sin parse_mode
          if (err.description?.includes('parse')) {
            await fetch(`${TELEGRAM_API}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, text: chunk }),
            });
          }
        }
        break; // éxito
      } catch (e) {
        if (attempt === retries) console.error('[Telegram] sendMessage falló:', e.message);
        else await new Promise(r => setTimeout(r, 1000 * attempt)); // backoff
      }
    }
  }
}

// Registrar webhook en Telegram al iniciar
async function registerTelegramWebhook() {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log('[Telegram] Sin TELEGRAM_BOT_TOKEN — canal desactivado');
    return;
  }
  const webhookUrl = `${VPS_PUBLIC_URL}/telegram/webhook`;
  try {
    const res = await fetch(`${TELEGRAM_API}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl, drop_pending_updates: true }),
    });
    const data = await res.json();
    if (data.ok) {
      console.log(`[Telegram] ✅ Webhook registrado: ${webhookUrl}`);
    } else {
      console.error('[Telegram] ❌ Error registrando webhook:', data.description);
    }
  } catch (e) {
    console.error('[Telegram] Error de red al registrar webhook:', e.message);
  }
}

// ── WHATSAPP (conecta con tu gateway Baileys existente) ───────────────────────

async function sendWhatsAppMessage(phone, text, retries = 3) {
  if (!WA_GATEWAY_URL) return;
  const normalizedPhone = phone.replace(/\D/g, '');
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${WA_GATEWAY_URL}/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(WA_GATEWAY_TOKEN ? { Authorization: `Bearer ${WA_GATEWAY_TOKEN}` } : {}),
        },
        body: JSON.stringify({ phone: normalizedPhone, message: text }),
      });
      if (res.ok) break;
      throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      if (attempt === retries) console.error('[WhatsApp] sendMessage falló:', e.message);
      else await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}

// ============================================================
// SECTION 1 — TELEGRAM WEBHOOK
// ============================================================

// Telegram llama a este endpoint con cada mensaje recibido
app.post('/telegram/webhook', async (req, res) => {
  // Siempre responder 200 rápido a Telegram para evitar reintentos
  res.sendStatus(200);

  try {
    const update = req.body;
    const message = update.message || update.edited_message;
    if (!message) return;

    const chatId   = message.chat.id;
    const text     = message.text || message.caption || '';
    const fromName = `${message.from?.first_name || ''} ${message.from?.last_name || ''}`.trim() || 'Usuario';
    const isGroup  = message.chat.type !== 'private';
    const hasPhoto = Array.isArray(message.photo) && message.photo.length > 0;
    const hasDoc   = message.document?.mime_type?.startsWith('image/');

    if (!agentActive) return;
    if (!text && !hasPhoto && !hasDoc) return;
    if (isGroup && !text.toLowerCase().includes('@') && !text.startsWith('/')) return;

    stats.telegramActive = chatSessions.size;
    const sessionKey = `telegram_${chatId}`;

    // ── Foto recibida → Gemini Vision ────────────────────────────────────────
    if (hasPhoto || hasDoc) {
      broadcastSSE({
        type: 'log', level: 'info',
        message: `[Telegram] 🖼️ ${fromName} envió una imagen`,
        timestamp: new Date().toISOString(),
      });

      await fetch(`${TELEGRAM_API}/sendChatAction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
      }).catch(() => {});

      // Obtener el file_id de la foto más grande
      const fileId = hasPhoto
        ? message.photo[message.photo.length - 1].file_id
        : message.document.file_id;

      // Obtener URL de descarga
      const fileInfoRes = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
      const fileInfo = await fileInfoRes.json();
      const filePath = fileInfo.result?.file_path;
      if (!filePath) { await sendTelegramMessage(chatId, '❌ No pude descargar la imagen.'); return; }

      const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
      const imgRes  = await fetch(fileUrl);
      const imgBuffer = await imgRes.arrayBuffer();
      const imgBase64 = Buffer.from(imgBuffer).toString('base64');
      const mimeType  = hasDoc ? message.document.mime_type : 'image/jpeg';

      const reply = await processWithAgentVision(imgBase64, mimeType, text, sessionKey);
      await sendTelegramMessage(chatId, reply);

      broadcastSSE({
        type: 'log', level: 'success',
        message: `[Telegram] ✅ Imagen analizada y respuesta enviada a ${fromName}`,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // ── Mensaje de texto normal ───────────────────────────────────────────────
    broadcastSSE({
      type: 'log', level: 'info',
      message: `[Telegram] 📩 ${fromName} (${isGroup ? 'grupo' : 'DM'}): "${text.slice(0, 80)}"`,
      timestamp: new Date().toISOString(),
    });

    await fetch(`${TELEGRAM_API}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
    }).catch(() => {});

    const reply = await processWithAgent(text, sessionKey);
    await sendTelegramMessage(chatId, reply);

    broadcastSSE({
      type: 'log', level: 'success',
      message: `[Telegram] ✅ Respuesta enviada a ${fromName}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Telegram] Error procesando update:', error.message);
    broadcastSSE({
      type: 'log', level: 'error',
      message: `[Telegram] ❌ Error: ${error.message}`,
      timestamp: new Date().toISOString(),
    });
  }
});

// Endpoint para consultar el estado del webhook de Telegram
app.get('/api/admin/telegram/status', requireApiKey, async (req, res) => {
  if (!TELEGRAM_BOT_TOKEN) return res.json({ status: 'disabled', message: 'Token no configurado' });
  try {
    const r = await fetch(`${TELEGRAM_API}/getWebhookInfo`);
    const data = await r.json();
    res.json({ status: 'ok', webhook: data.result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// SECTION 2 — WHATSAPP WEBHOOK (desde tu Gateway Baileys)
// ============================================================

app.post('/api/openclaw/webhook', async (req, res) => {
  try {
    if (!agentActive) {
      return res.status(503).json({ status: 'agent_stopped' });
    }

    const { candidateId, phone, message, candidateData } = req.body;
    if (!phone || !message) return res.status(400).json({ error: 'phone y message son requeridos' });

    const nombre = candidateData?.nombre || phone;

    broadcastSSE({
      type: 'log', level: 'info',
      message: `[WhatsApp] 📱 ${nombre}: "${message.slice(0, 80)}"`,
      timestamp: new Date().toISOString(),
    });

    const sessionKey = `whatsapp_${phone}`;
    const reply = await processWithAgent(message, sessionKey);

    // Enviar respuesta de vuelta al número de WhatsApp
    await sendWhatsAppMessage(phone, reply);

    broadcastSSE({
      type: 'log', level: 'success',
      message: `[WhatsApp] ✅ Respuesta enviada a ${nombre}`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({ status: 'processed', reply });
  } catch (error) {
    console.error('[WhatsApp] Error webhook:', error.message);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ============================================================
// SECTION 3 — DASHBOARD ADMIN ENDPOINTS
// ============================================================

app.post('/api/admin/start', requireApiKey, (req, res) => {
  agentActive = true;
  broadcastSSE({ type: 'sys', message: '[System] 🟢 Agente INICIADO', timestamp: new Date().toISOString() });
  res.json({ status: 'success', agentActive });
});

app.post('/api/admin/stop', requireApiKey, (req, res) => {
  agentActive = false;
  broadcastSSE({ type: 'sys', message: '[System] 🔴 Agente DETENIDO (Kill Switch activado)', timestamp: new Date().toISOString() });
  res.json({ status: 'success', agentActive });
});

app.get('/api/admin/stats', requireApiKey, (req, res) => {
  res.json({
    status: 'success',
    data: {
      agentActive,
      activeConversations: chatSessions.size,
      messagesToday: stats.messagesToday,
      candidatesTransferred: stats.candidatesTransferred,
      channels: {
        telegram: TELEGRAM_BOT_TOKEN ? 'active' : 'disabled',
        whatsapp: WA_GATEWAY_URL     ? 'active' : 'disabled',
      },
    },
  });
});

app.get('/api/admin/conversations', requireApiKey, (req, res) => {
  const convs = [];
  chatSessions.forEach((history, key) => {
    const last = history[history.length - 1];
    convs.push({
      id: key,
      channel: key.startsWith('telegram_') ? 'telegram' : key.startsWith('whatsapp_') ? 'whatsapp' : 'dashboard',
      messages: history.length,
      lastMessage: last?.parts?.[0]?.text?.slice(0, 60) || '',
      lastUpdate: new Date().toISOString(),
    });
  });
  res.json({ status: 'success', data: convs });
});

// Leer y actualizar System Prompt en caliente
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
    broadcastSSE({ type: 'sys', message: '[System] ⚠️ System Prompt actualizado en caliente.', timestamp: new Date().toISOString() });
    res.json({ status: 'success', message: 'Prompt actualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Error guardando AGENTS.md' });
  }
});

// ── Skills endpoint ───────────────────────────────────────────────────────────
const skillsDir = path.join(__dirname, 'workspace', 'skills');

function parseSkillMd(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const front = {};
  match[1].split('\n').forEach(line => {
    const [k, ...v] = line.split(':');
    if (k && v.length) front[k.trim()] = v.join(':').trim();
  });
  // Parse metadata JSON inline
  try {
    const metaMatch = content.match(/metadata:\s*(\{[\s\S]*?\})\s*\n/);
    if (metaMatch) front._meta = JSON.parse(metaMatch[1]);
  } catch {}
  return front;
}

app.get('/api/admin/skills', requireApiKey, (req, res) => {
  try {
    if (!fs.existsSync(skillsDir)) return res.json({ status: 'success', data: [] });
    const entries = fs.readdirSync(skillsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => {
        const skillMdPath = path.join(skillsDir, d.name, 'SKILL.md');
        if (!fs.existsSync(skillMdPath)) return null;
        const content = fs.readFileSync(skillMdPath, 'utf8');
        const front = parseSkillMd(content);
        const meta = front._meta?.openclaw || {};
        // Determine real status based on env vars
        let status = meta.status || 'unknown';
        if (status === 'active') {
          const reqEnv = meta.requires?.env?.[0];
          if (reqEnv && !process.env[reqEnv]) status = 'misconfigured';
        }
        return {
          id: d.name,
          name: front.name || d.name,
          description: front.description || '',
          emoji: meta.emoji || '⚙️',
          status,
          userInvocable: front['user-invocable'] !== 'false',
          requires: meta.requires || {},
          primaryEnv: meta.primaryEnv || null,
          homepage: meta.homepage || null,
        };
      })
      .filter(Boolean);
    res.json({ status: 'success', data: entries });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Chat directo con el agente desde el Dashboard
app.post('/api/admin/chat', requireApiKey, async (req, res) => {
  try {
    const { message, sessionId = 'dashboard-chat', imageBase64, mimeType } = req.body;
    if (!message && !imageBase64) return res.status(400).json({ error: 'message o imagen requerido' });

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GOOGLE_API_KEY no configurada en el VPS' });

    let reply;
    if (imageBase64) {
      reply = await processWithAgentVision(imageBase64, mimeType || 'image/jpeg', message || '', sessionId);
    } else {
      reply = await processWithAgent(message, sessionId);
    }
    broadcastSSE({ type: 'info', message: `[Dashboard Chat] Turno completado`, timestamp: new Date().toISOString() });
    res.json({ status: 'success', reply });
  } catch (error) {
    console.error('[Chat] Error:', error.message);
    res.status(500).json({ error: error.message || 'Error interno' });
  }
});

// ============================================================
// SECTION 4 — SSE LIVE FEED
// ============================================================

app.get('/api/admin/feed', (req, res) => {
  const token = req.query.token;
  if (token !== API_KEY) return res.status(401).end();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: 'sys', message: '[System] 🔌 Conectado al Live Feed de OpenClaw...', timestamp: new Date().toISOString() })}\n\n`);
  clientsSSE.push(res);

  // Heartbeat cada 30s para mantener la conexión viva
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    clientsSSE = clientsSSE.filter(c => c !== res);
  });
});

function broadcastSSE(data) {
  clientsSSE.forEach(client => {
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  });
}

// ============================================================
// INICIO DEL SERVIDOR
// ============================================================

app.listen(PORT, async () => {
  console.log(`🚀 OpenClaw Backend escuchando en http://localhost:${PORT}`);
  console.log(`   Telegram: ${TELEGRAM_BOT_TOKEN ? '✅ token configurado' : '⚠️  sin token (TELEGRAM_BOT_TOKEN)'}`);
  console.log(`   WhatsApp: ${WA_GATEWAY_URL ? `✅ gateway en ${WA_GATEWAY_URL}` : '⚠️  sin gateway'}`);

  // Registrar webhook de Telegram al arrancar
  await registerTelegramWebhook();
});
