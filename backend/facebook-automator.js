import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import puppeteer from 'puppeteer-core';
import fs, { existsSync } from 'fs';

// Activar plugin anti-detección con TODOS los evasiones
puppeteerExtra.use(StealthPlugin());

import os from 'os';

const IS_SERVER = os.platform() === 'linux';
const CHROME_PROFILE_PATH = '/root/chrome-profile';
const CHROMIUM_PATH = '/usr/bin/google-chrome-stable';

// === ANTI-SPAM: Cooldown entre posts ===
let lastPostTime = 0;
const MIN_COOLDOWN_MS = 3 * 60 * 1000; // Mínimo 3 minutos entre posts

// === UTILIDADES HUMANAS ===
function randomDelay(min = 800, max = 2500) {
  return new Promise(r => setTimeout(r, min + Math.random() * (max - min)));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Mueve el mouse de forma orgánica a una posición aleatoria en la página.
 */
async function humanMouseMove(page) {
  const x = randomInt(100, 900);
  const y = randomInt(100, 600);
  await page.mouse.move(x, y, { steps: randomInt(5, 15) });
  await randomDelay(200, 600);
}

/**
 * Hace scroll suave como si estuvieras leyendo el feed.
 */
async function humanScroll(page) {
  const scrolls = randomInt(2, 5);
  for (let i = 0; i < scrolls; i++) {
    await page.evaluate((distance) => {
      window.scrollBy({ top: distance, behavior: 'smooth' });
    }, randomInt(100, 400));
    await randomDelay(500, 1500);
  }
  // Regresar arriba para encontrar el composer
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await randomDelay(800, 1500);
}

/**
 * Escribe texto caracter por caracter con velocidad humana variable.
 */
async function humanType(page, selector, text) {
  for (const char of text) {
    await page.keyboard.type(char, { delay: randomInt(30, 120) });
    // Pausa aleatoria más larga cada ciertos caracteres (como si pensaras)
    if (Math.random() < 0.05) {
      await randomDelay(300, 800);
    }
  }
}

/**
 * Lanza un Chromium propio en el servidor con la sesión de Facebook pre-cargada,
 * o conecta al Chrome local si estamos en la Mac de Oscar.
 */
export async function publishViaPuppeteer({ message }) {
  // === COOLDOWN CHECK ===
  const now = Date.now();
  const elapsed = now - lastPostTime;
  if (lastPostTime > 0 && elapsed < MIN_COOLDOWN_MS) {
    const waitSecs = Math.ceil((MIN_COOLDOWN_MS - elapsed) / 1000);
    console.log(`[Facebook Automator] Cooldown activo — esperando ${waitSecs}s antes del siguiente post`);
    await new Promise(r => setTimeout(r, MIN_COOLDOWN_MS - elapsed));
  }

  let browser;
  let shouldClose = false;

  try {
    if (IS_SERVER) {
      // === MODO SERVIDOR (DigitalOcean) ===
      console.log('[Facebook Automator] Modo SERVIDOR — lanzando Chromium stealth...');
      browser = await puppeteerExtra.launch({
        executablePath: CHROMIUM_PATH,
        headless: 'new',
        userDataDir: CHROME_PROFILE_PATH,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--no-first-run',
          '--no-zygote',
          '--disable-extensions',
          '--disable-blink-features=AutomationControlled',
          '--window-size=1280,800',
          '--lang=es-MX',
        ],
        defaultViewport: { width: 1280, height: 800 },
        ignoreDefaultArgs: ['--enable-automation'],
      });
      shouldClose = true;
    } else {
      // === MODO LOCAL (Mac de Oscar) ===
      console.log('[Facebook Automator] Modo LOCAL — conectando a Chrome:9222...');
      browser = await puppeteer.connect({
        browserURL: 'http://127.0.0.1:9222',
        defaultViewport: null
      });
    }
  } catch (error) {
    console.error('[Facebook Automator] Error iniciando/conectando Chrome:', error.message);
    return IS_SERVER
      ? `[ERROR] No pude lanzar Chromium en el servidor: ${error.message}`
      : "[ERROR] No me pude conectar a Chrome. ¿Ejecutaste Chrome con --remote-debugging-port=9222?";
  }

  try {
    let fbPage;

    if (IS_SERVER) {
      fbPage = await browser.newPage();

      // INYECCIÓN DE COOKIES
      const cookiesPath = '/root/CandidaticClaw/backend/fb-cookies.json';
      if (existsSync(cookiesPath)) {
        console.log('[Facebook Automator] Inyectando cookies desde fb-cookies.json...');
        const cookiesStr = fs.readFileSync(cookiesPath, 'utf8');
        const cookies = JSON.parse(cookiesStr);
        await fbPage.setCookie(...cookies);
      }

      // Fingerprint idéntico a tu Mac real
      await fbPage.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      );
      await fbPage.setExtraHTTPHeaders({
        'Accept-Language': 'es-MX,es;q=0.9,en-US;q=0.8,en;q=0.7',
      });

      // Overrides extra anti-detección
      await fbPage.evaluateOnNewDocument(() => {
        // Ocultar que es headless
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        // Simular plugins reales de Mac
        Object.defineProperty(navigator, 'plugins', {
          get: () => [
            { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
            { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
            { name: 'Native Client', filename: 'internal-nacl-plugin' },
          ],
        });
        // Simular plataforma Mac
        Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel' });
        // Simular hardware concurrency de iMac
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
        // Timezone de México
        Object.defineProperty(Intl.DateTimeFormat.prototype, 'resolvedOptions', {
          value: function() {
            return { timeZone: 'America/Mexico_City', locale: 'es-MX' };
          }
        });
      });

      console.log('[Facebook Automator] Navegando a Facebook...');
      await fbPage.goto('https://www.facebook.com/', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });

      // Verificar si estamos logueados
      const currentUrl = fbPage.url();
      console.log('[Facebook Automator] URL actual:', currentUrl);

      if (currentUrl.includes('login') || currentUrl.includes('checkpoint')) {
        return "[ERROR] La sesión de Facebook expiró. Necesitas actualizar las cookies del perfil (scp de Cookies).";
      }

      // === COMPORTAMIENTO HUMANO: scroll por el feed antes de postear ===
      await randomDelay(2000, 4000);
      await humanMouseMove(fbPage);
      await humanScroll(fbPage);

    } else {
      // En local, buscar la pestaña existente
      const pages = await browser.pages();
      fbPage = pages.find(p => p.url().includes('facebook.com'));
      if (!fbPage) {
        return "[ERROR] No encontré ninguna pestaña abierta en facebook.com";
      }
      await fbPage.bringToFront();
    }

    console.log('[Facebook Automator] Intentando publicar en FB...');

    // === PASO 1: Encontrar y clickear el composer ===
    const composerClicked = await fbPage.evaluate(async () => {
      const sleep = (ms) => new Promise(res => setTimeout(res, ms));

      const composerTriggers = Array.from(document.querySelectorAll('div[role="button"]'))
         .filter(el => el.innerText.includes('¿Qué estás') || el.innerText.includes("What's on your") || el.innerText.includes('escribe algo') || el.innerText.includes('Write something'));

      let triggerFound = null;
      if (composerTriggers.length > 0) {
        triggerFound = composerTriggers[0];
      } else {
        const ariaTriggers = document.querySelectorAll('[aria-label*="¿Qué estás pensando"], [aria-label*="What\'s on your mind"]');
        if (ariaTriggers.length > 0) triggerFound = ariaTriggers[0];
      }

      if (!triggerFound) {
        const spanFallback = Array.from(document.querySelectorAll('span')).find(s =>
          s.innerText.includes('¿Qué estás pensando') || s.innerText.includes("What's on your mind"));
        if (spanFallback) triggerFound = spanFallback.closest('div[role="button"]');
      }

      if (!triggerFound) return false;

      triggerFound.click();
      return true;
    });

    if (!composerClicked) {
      await fbPage.screenshot({ path: '/tmp/error-ui.png', fullPage: true });
      return "[ERROR UI] No pude encontrar el botón de publicación. ¿La página cargó bien?";
    }

    // Esperar que el modal abra con delay humano o hasta que aparezca explícitamente
    await randomDelay(2000, 3500);
    try {
      await fbPage.waitForSelector('div[role="textbox"][contenteditable="true"]', { visible: true, timeout: 15000 });
    } catch(e) {
      console.log('[Facebook Automator] ⚠️ El popup de texto tardó más de 15s en aparecer o no cargó.');
    }
    
    await humanMouseMove(fbPage);

    // === PASO 2: Encontrar el textbox y escribir gradualmente ===
    const textboxFound = await fbPage.evaluate(() => {
      const textboxes = document.querySelectorAll('div[role="textbox"][contenteditable="true"]');
      for (let tb of textboxes) {
        if (tb.offsetHeight > 0 || tb.getClientRects().length > 0) {
          tb.focus();
          return true;
        }
      }
      return false;
    });

    if (!textboxFound) {
      return "[ERROR UI] No pude detectar el cuadro de texto del post (tardó mucho en cargar).";
    }

    // === PASO EXTRA: Forzar privacidad a Público (si existe selector) ===
    await fbPage.evaluate(async () => {
      const sleep = ms => new Promise(res => setTimeout(res, ms));
      try {
        const buttons = Array.from(document.querySelectorAll('div[role="button"]'));
        const privacyBtn = buttons.find(b => {
            const txt = b.innerText || '';
            const rect = b.getBoundingClientRect();
            // Evitamos dar click en cosas muy grandes, los botones de privacidad son pequeños
            return (txt === 'Amigos' || txt === 'Solo yo' || txt === 'Público' || txt === 'Friends' || txt === 'Only me' || txt === 'Public') && rect.height > 0 && rect.width < 250;
        });

        if (privacyBtn && privacyBtn.innerText !== 'Público' && privacyBtn.innerText !== 'Public') {
            console.log("Cambiando privacidad...");
            privacyBtn.click();
            await sleep(2000); // Esperar animación del modal
            
            const radios = Array.from(document.querySelectorAll('div[role="radio"]'));
            const publicRadio = radios.find(r => r.innerText.includes('Público') || r.innerText.includes('Public'));
            if (publicRadio) {
                publicRadio.click();
                await sleep(1000);
            }
            
            const saveBtns = Array.from(document.querySelectorAll('div[aria-label="Guardar"], div[aria-label="Save"], div[aria-label="Listo"], div[aria-label="Done"], div[role="button"]'));
            const saveBtn = saveBtns.find(b => b.innerText === 'Guardar' || b.innerText === 'Save' || b.innerText === 'Listo' || b.innerText === 'Done');
            if (saveBtn) saveBtn.click();
            await sleep(1500); // Esperar que cierre el modal
        }
    } catch(e) {}
    });

    // Reenfocar obligatoriamente el cuadro de texto tras cualquier cambio de modal de privacidad
    await randomDelay(1000, 2000);
    await fbPage.evaluate(() => {
      const textboxes = document.querySelectorAll('div[role="textbox"][contenteditable="true"]');
      for (let tb of textboxes) {
        if (tb.offsetHeight > 0 || tb.getClientRects().length > 0) {
          tb.focus();
        }
      }
    });

    // Escribir caracter por caracter como humano
    await randomDelay(500, 1000);
    await humanType(fbPage, null, message);
    
    if (message.includes('http')) {
       console.log(`[Facebook Automator] Link detectado. Esperando 8 segundos para que cargue la tarjeta de metadatos...`);
       await new Promise(r => setTimeout(r, 8000));
       await fbPage.keyboard.type(' ');
       await randomDelay(1000, 2000);
    } else {
       console.log('[Facebook Automator] Texto escrito. Esperando antes de publicar...');
       await randomDelay(2000, 4000);
    }

    try {
      const postClicked = await fbPage.evaluate(async () => {
        const sleep = (ms) => new Promise(res => setTimeout(res, ms));
        await sleep(500);

        const buttons = Array.from(document.querySelectorAll('div[role="button"]'))
          .filter(b => b.innerText === 'Publicar' || b.innerText === 'Post');

        let postButton = null;
        if (buttons.length > 0) {
          postButton = buttons.find(b => b.getAttribute("aria-disabled") !== "true") || buttons[0];
        } else {
          const ariaButtons = document.querySelectorAll('[aria-label="Publicar"], [aria-label="Post"]');
          for (let b of ariaButtons) {
            if (b.offsetHeight > 0) {
              postButton = b;
              break;
            }
          }
        }

        if (!postButton) return false;

        postButton.click();
        return true;
      });

      if (!postClicked) {
        return "[ERROR UI] Dejé el texto escrito, pero el botón 'Publicar' no apareció.";
      }

      // Esperar a que se publique
      await randomDelay(3000, 5000);
    } catch (e) {
      if (e.message.includes('Promise was collected') || e.message.includes('Session closed') || e.message.includes('TargetCloseError')) {
        console.log('[Facebook Automator] Ignorando error de sesión cerrada al dar click a publicar (¡el post se mandó exitosamente!).');
      } else {
        throw e;
      }
    }

    // Registrar timestamp del post
    lastPostTime = Date.now();
    console.log('[Facebook Automator] ✅ Post publicado exitosamente.');

    return "[POST PUBLICADO EXITOSAMENTE]";

  } catch (error) {
    console.error('[Facebook Automator] Error en la ejecución:', error.message);
    return `[ERROR FATAL PUPPETEER] ${error.message}`;
  } finally {
    if (shouldClose && browser) {
      await browser.close();
    } else if (browser) {
      browser.disconnect();
    }
  }
}

/**
 * Navega a facebook y extrae la lista de grupos a los que estás unido.
 */
export async function getFacebookGroups() {
  let browser;
  let shouldClose = false;

  console.log('[Facebook Automator] Extrayendo grupos...');
  browser = await puppeteerExtra.launch({
    headless: true,
    executablePath: CHROMIUM_PATH,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--js-flags="--max-old-space-size=256"',
      '--disable-accelerated-2d-canvas'
    ]
  });
  shouldClose = true;

  try {
    const fbPage = await browser.newPage();
    
    // Inyección de cookies
    if (existsSync('/root/CandidaticClaw/backend/fb-cookies.json')) {
      const cookiesStr = fs.readFileSync('/root/CandidaticClaw/backend/fb-cookies.json', 'utf8');
      await fbPage.setCookie(...JSON.parse(cookiesStr));
    } else {
      throw new Error("Cookies no encontradas en el servidor.");
    }

    await fbPage.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    console.log('[Facebook Automator] Navegando a facebook.com/groups/joins/ ...');
    await fbPage.goto('https://www.facebook.com/groups/joins/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    await fbPage.waitForSelector('a[href*="/groups/"]', { visible: true, timeout: 15000 }).catch(() => null);
    await randomDelay(2000, 3000);

    // Bucle de auto-scrolling para cargar LOS 243+ GRUPOS (Infinite Scroll de Facebook)
    console.log('[Facebook Automator] Haciendo auto-scroll para cargar todos los grupos...');
    let previousHeight = await fbPage.evaluate('document.body.scrollHeight');
    let scrollAttempts = 0;
    while (scrollAttempts < 15) { // Límite de seguridad
      await fbPage.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await new Promise(r => setTimeout(r, 1500)); // Esperar a que Facebook cargue más red
      
      let newHeight = await fbPage.evaluate('document.body.scrollHeight');
      if (newHeight === previousHeight) {
         // Intento extra por si hay lag cargando
         await new Promise(r => setTimeout(r, 2000));
         newHeight = await fbPage.evaluate('document.body.scrollHeight');
         if (newHeight === previousHeight) break; // Llegamos al final de todos los grupos
      }
      previousHeight = newHeight;
      scrollAttempts++;
    }

    const grupos = await fbPage.evaluate(() => {
      const links = document.querySelectorAll('a[href*="/groups/"]');
      const results = [];
      const idSet = new Set();
      
      links.forEach(a => {
        const url = a.href;
        let nombre = a.innerText.trim();
        if (!nombre) nombre = a.getAttribute('aria-label') || '';
        
        if (nombre && url) {
           if (nombre.toLowerCase().includes('crear') || nombre.toLowerCase().includes('descubrir') || nombre.toLowerCase().includes('grupos')) return;
           
           let groupId = null;
           const parts = url.split('/groups/');
           if (parts.length > 1) {
              groupId = parts[1].split('/')[0].split('?')[0]; 
           }
           
           if (groupId && !idSet.has(groupId) && groupId !== 'joins' && groupId !== 'create') {
              idSet.add(groupId);
              const nombreLimpio = nombre.split('\\n')[0].trim();
              results.push({ id: groupId, name: nombreLimpio, url: `https://www.facebook.com/groups/${groupId}` });
           }
        }
      });
      return results;
    });

    console.log(`[Facebook Automator] ✅ Extracción completada: ${grupos.length} grupos.`);
    return grupos;

  } catch (error) {
    console.error('[Facebook Automator] Error extrayendo grupos:', error.message);
    throw error;
  } finally {
    if (shouldClose && browser) await browser.close();
  }
}

/**
 * Publica un mensaje secuencialmente en varios grupos
 */
export async function publishToGroups(groupIds, message) {
  let browser;
  try {
    console.log('[Facebook Automator] Modo Servidor — lanzando Chromium para GRUPOS...');
    browser = await puppeteerExtra.launch({
      headless: true,
      executablePath: CHROMIUM_PATH,
      args: [
        '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
        '--disable-gpu', '--js-flags="--max-old-space-size=256"'
      ]
    });

    const fbPage = await browser.newPage();
    if (existsSync('/root/CandidaticClaw/backend/fb-cookies.json')) {
      const cookiesStr = fs.readFileSync('/root/CandidaticClaw/backend/fb-cookies.json', 'utf8');
      await fbPage.setCookie(...JSON.parse(cookiesStr));
    } else {
      throw new Error("Cookies no encontradas en el servidor.");
    }
    await fbPage.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    const resultados = [];
    for (let groupId of groupIds) {
      console.log(`[Grupos] Navegando al grupo ${groupId}...`);
      await fbPage.goto(`https://www.facebook.com/groups/${groupId}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await randomDelay(3000, 5000);

      const composerFound = await fbPage.evaluate(() => {
        const triggers = Array.from(document.querySelectorAll('div[role="button"]'))
           .filter(el => el.innerText.includes('Escribe algo') || el.innerText.includes('Write something'));
        if (triggers.length > 0) { triggers[0].click(); return true; }
        return false;
      });

      if (!composerFound) {
        resultados.push(`❌ Grupo ${groupId}: Botón 'Escribe algo' NO encontrado.`);
        continue;
      }

      await fbPage.waitForSelector('div[role="textbox"][contenteditable="true"]', { visible: true, timeout: 8000 }).catch(()=>null);
      await randomDelay(1000, 2000);

      const textboxFound = await fbPage.evaluate(() => {
        const tbs = document.querySelectorAll('div[role="textbox"][contenteditable="true"]');
        for (let tb of tbs) {
          if (tb.offsetHeight > 0 || tb.getClientRects().length > 0) { tb.focus(); return true; }
        }
        return false;
      });

      if (!textboxFound) {
         resultados.push(`❌ Grupo ${groupId}: Modal no cargó.`);
         continue;
      }

      // PASO EXTRA: Forzar privacidad a Público si se detecta selector (algunos grupos de compraventa lo tienen)
      await fbPage.evaluate(async () => {
        const sleep = ms => new Promise(res => setTimeout(res, ms));
        try {
          const buttons = Array.from(document.querySelectorAll('div[role="button"]'));
          const privacyBtn = buttons.find(b => {
              const txt = b.innerText || '';
              const rect = b.getBoundingClientRect();
              return (txt === 'Amigos' || txt === 'Solo yo' || txt === 'Público' || txt === 'Friends' || txt === 'Only me' || txt === 'Public') && rect.height > 0 && rect.width < 250;
          });

          if (privacyBtn && privacyBtn.innerText !== 'Público' && privacyBtn.innerText !== 'Public') {
              privacyBtn.click();
              await sleep(2000);
              
              const radios = Array.from(document.querySelectorAll('div[role="radio"]'));
              const publicRadio = radios.find(r => r.innerText.includes('Público') || r.innerText.includes('Public'));
              if (publicRadio) {
                  publicRadio.click();
                  await sleep(1000);
              }
              
              const saveBtns = Array.from(document.querySelectorAll('div[aria-label="Guardar"], div[aria-label="Save"], div[aria-label="Listo"], div[aria-label="Done"], div[role="button"]'));
              const saveBtn = saveBtns.find(b => b.innerText === 'Guardar' || b.innerText === 'Save' || b.innerText === 'Listo' || b.innerText === 'Done');
              if (saveBtn) saveBtn.click();
              await sleep(1500);
          }
        } catch(e) {}
      });

      // Reenfocar obligatoriamente el cuadro de texto tras cualquier cambio de modal de privacidad
      await randomDelay(1000, 2000);
      await fbPage.evaluate(() => {
        const textboxes = document.querySelectorAll('div[role="textbox"][contenteditable="true"]');
        for (let tb of textboxes) {
          if (tb.offsetHeight > 0 || tb.getClientRects().length > 0) {
            tb.focus();
          }
        }
      });

      // Reusar humanType
      for (const char of message) {
        await fbPage.keyboard.type(char, { delay: randomInt(30, 100) });
        if (Math.random() < 0.05) await randomDelay(300, 600);
      }
      
      if (message.includes('http')) {
         console.log(`[Grupos] Link detectado en el mensaje. Esperando 8 segundos para que Facebook genere la tarjeta de metadatos...`);
         await new Promise(r => setTimeout(r, 8000));
         // Damos un espacio extra para asegurar que el DOM actualice el estado del botón Publicar
         await fbPage.keyboard.type(' ');
         await randomDelay(1000, 2000);
      } else {
         await randomDelay(1000, 2000);
      }

      const btnClicked = await fbPage.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('div[aria-label="Publicar"], div[aria-label="Post"]'));
        const btn = btns.find(b => b.getAttribute('aria-disabled') !== 'true');
        if (btn) { btn.click(); return true; }
        return false;
      });

      if (btnClicked) {
        resultados.push(`✅ Grupo ${groupId}: POST PUBLICADO.`);
        await new Promise(r => setTimeout(r, 8000)); // Esperar a que la página se autorefresque
      } else {
        resultados.push(`❌ Grupo ${groupId}: Botón Publicar deshabilitado.`);
      }
    }
    return resultados.join('\\n');
  } catch (error) {
    console.error('[Automator] Error publicando en grupos:', error.message);
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}

/**
 * Lee los últimos posts del Timeline (Perfil Personal o Feed de Inicio)
 */
export async function getProfileFeed(limit = 5) {
  let browser;
  try {
    console.log('[Facebook Automator] Extrayendo feed del perfil...');
    browser = await puppeteerExtra.launch({
      executablePath: CHROMIUM_PATH,
      headless: 'new',
      userDataDir: IS_SERVER ? CHROME_PROFILE_PATH : undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,800']
    });

    const page = await browser.newPage();
    
    if (IS_SERVER) {
      if (existsSync('/root/CandidaticClaw/backend/fb-cookies.json')) {
        const cookies = JSON.parse(fs.readFileSync('/root/CandidaticClaw/backend/fb-cookies.json', 'utf8'));
        await page.setCookie(...cookies);
      }
    }

    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    await page.goto('https://www.facebook.com/me', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Scrollear para cargar artículos
    for (let i = 0; i < 3; i++) {
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await new Promise(r => setTimeout(r, 2000));
    }

    const posts = await page.evaluate((maxPosts) => {
      const results = [];
      const divFeed = document.querySelectorAll('div[role="article"], div.x1yztbdb.x1n2onr6.xh8yej3.x1ja2u2z');
      const articles = Array.from(divFeed);
      
      for (const article of articles) {
        if (results.length >= maxPosts) break;
        const rawText = article.innerText;
        // Filtrar basura
        if (rawText && rawText.length > 20 && !rawText.includes('Escribe algo') && !rawText.includes('on your mind')) {
          // Limpiar el texto dividiendolo por lineas, removiendo basura
          const lines = rawText.split('\\n').filter(l => l.length > 2 && l.trim() !== 'Facebook');
          
          let author = lines[0];
          let dateStr = lines[1] && typeof lines[1] === 'string' ? lines[1] : '';
          
          // El texto del post suele ser todo hasta que llega a botones como Me gusta o comentarios
          const contentLines = [];
          let metricsStr = "";
          for (let i = 2; i < lines.length; i++) {
            if (lines[i] === 'Me gusta' || lines[i] === 'Comentar' || lines[i] === 'Compartir') {
                continue;
            }
            if (lines[i] === 'Escribe un comentario…') {
                break;
            }
            if (lines[i].includes('comentarios') || lines[i].includes('veces compartido')) {
                metricsStr += lines[i] + ' ';
                continue;
            }
            contentLines.push(lines[i]);
          }

          results.push({
            author,
            context: dateStr,
            content: contentLines.join('\\n'),
            metrics: metricsStr.trim()
          });
        }
      }
      return results;
    }, limit);

    return posts;
  } catch (error) {
    console.error('[Automator] Error extrayendo feed:', error.message);
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}

/**
 * Lee las notificaciones de la cuenta para seguimiento de grupos.
 */
export async function getFacebookNotifications(limit = 10) {
  let browser;
  try {
    console.log('[Facebook Automator] Leyendo Notificaciones...');
    browser = await puppeteerExtra.launch({
      executablePath: CHROMIUM_PATH,
      headless: 'new',
      userDataDir: IS_SERVER ? CHROME_PROFILE_PATH : undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    if (IS_SERVER && existsSync('/root/CandidaticClaw/backend/fb-cookies.json')) {
      const cookies = JSON.parse(fs.readFileSync('/root/CandidaticClaw/backend/fb-cookies.json', 'utf8'));
      await page.setCookie(...cookies);
    }
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    // Visitamos el home y abrimos el dropdown de notificaciones
    await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await randomDelay(3000, 5000);
    
    // Intentar buscar el botón de la campanita
    await page.evaluate(() => {
        const bell = document.querySelector('div[aria-label="Notificaciones"], div[aria-label="Notifications"], a[aria-label="Notificaciones"]');
        if (bell) bell.click();
    });
    await randomDelay(3000, 5000);
    
    const notifs = await page.evaluate((max) => {
        const results = [];
        // Extraemos textos de enlaces visibles en el layout que contengan palabras clave
        const links = Array.from(document.querySelectorAll('a'));
        for (let a of links) {
            const rawText = a.innerText.replace(/\\n/g, ' ').trim();
            if (rawText.length > 15 && (
                rawText.toLowerCase().includes('comentó') || 
                rawText.toLowerCase().includes('reaccionó') || 
                rawText.toLowerCase().includes('publicación') || 
                rawText.toLowerCase().includes('grupo')
            )) {
                results.push({ text: rawText, link: a.href });
            }
        }
        return results.slice(0, max);
    }, limit);

    return notifs;
  } catch (error) {
    console.error('[Automator] Error en notificaciones:', error.message);
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}

/**
 * Lee el Registro de Actividad para ver exactamente dónde se publicó exitosamente.
 */
export async function getFacebookActivityLog(limit = 10) {
  let browser;
  try {
    console.log('[Facebook Automator] Leyendo Registro de Actividad...');
    browser = await puppeteerExtra.launch({
      executablePath: CHROMIUM_PATH,
      headless: 'new',
      userDataDir: IS_SERVER ? CHROME_PROFILE_PATH : undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    if (IS_SERVER && existsSync('/root/CandidaticClaw/backend/fb-cookies.json')) {
      const cookies = JSON.parse(fs.readFileSync('/root/CandidaticClaw/backend/fb-cookies.json', 'utf8'));
      await page.setCookie(...cookies);
    }
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    await page.goto('https://www.facebook.com/me/allactivity', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await randomDelay(4000, 6000);
    
    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await randomDelay(2000, 3000);

    const activity = await page.evaluate((max) => {
        const results = [];
        const items = Array.from(document.querySelectorAll('div[role="article"], div[role="row"]'));
        for (let item of items) {
           const rawText = item.innerText.replace(/\\n/g, ' | ').trim();
           if (rawText.length > 20 && !rawText.includes('Registro de actividad')) {
               results.push({ content: rawText });
           }
        }
        return results.slice(0, max);
    }, limit);

    return activity;
  } catch (error) {
    console.error('[Automator] Error en Registro de Actividad:', error.message);
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}
