# Deploy al VPS — Candidatic Copilot Backend

## Problema detectado
El VPS estaba corriendo `openclaw gateway` (versión nativa) que NO tiene el endpoint
`/api/admin/chat`. El backend Express personalizado (`index.js`) es el que tiene todas
las rutas que necesita el dashboard.

## Paso 1 — Conectar al VPS
```bash
ssh root@64.23.180.202
```

## Paso 2 — Ir al directorio del proyecto
```bash
cd /ruta/al/proyecto/backend
# Si no tienes el directorio, clona el repo o sube los archivos con scp
```

## Paso 3 — Subir/actualizar los archivos desde tu Mac
En tu Mac (NO en el VPS), corre:
```bash
scp -r "/Users/oscar/Candidatic Claw/backend/index.js" root@64.23.180.202:/root/candidatic-claw/backend/
scp -r "/Users/oscar/Candidatic Claw/backend/ecosystem.config.js" root@64.23.180.202:/root/candidatic-claw/backend/
scp -r "/Users/oscar/Candidatic Claw/backend/package.json" root@64.23.180.202:/root/candidatic-claw/backend/
```
(Ajusta la ruta `/root/candidatic-claw/backend/` según donde esté en tu VPS)

## Paso 4 — En el VPS: instalar dependencias
```bash
cd /root/candidatic-claw/backend
npm install
```

## Paso 5 — En el VPS: configurar la API Key de Gemini
Edita el ecosystem.config.js y reemplaza `PON_TU_API_KEY_DE_GEMINI` con tu key real:
```bash
nano ecosystem.config.js
```
O directamente:
```bash
export GOOGLE_API_KEY="AIza..."  # Tu API Key real de Google AI Studio
```

## Paso 6 — Reiniciar PM2
```bash
pm2 stop candidatic-copilot-daemon
pm2 delete candidatic-copilot-daemon
pm2 start ecosystem.config.js
pm2 save
pm2 logs candidatic-copilot-daemon --lines 30
```

## Paso 7 — Verificar
```bash
curl -X POST http://localhost:3000/api/admin/chat \
  -H "x-api-key: super_secret_key_123" \
  -H "Content-Type: application/json" \
  -d '{"message":"hola","sessionId":"test"}'
```
Debe responder con `{"status":"success","reply":"..."}`.

## Si no tienes acceso SSH — Alternativa con GitHub
1. Haz push de los cambios al repo
2. En el VPS: `git pull && npm install && pm2 restart ecosystem.config.js`
