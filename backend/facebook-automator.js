import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import puppeteer from 'puppeteer-core';
import fs, { existsSync } from 'fs';

// Activar plugin anti-detección con TODOS los evasiones
puppeteerExtra.use(StealthPlugin());

const IS_SERVER = existsSync('/root/chrome-profile');
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
      return "[ERROR UI] No pude encontrar el botón de publicación. ¿La página cargó bien?";
    }

    // Esperar que el modal abra con delay humano
    await randomDelay(2000, 3500);
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
      return "[ERROR UI] No pude detectar el cuadro de texto del post.";
    }

    // Escribir caracter por caracter como humano
    await randomDelay(500, 1000);
    await humanType(fbPage, null, message);
    console.log('[Facebook Automator] Texto escrito. Esperando antes de publicar...');

    // Pausa humana después de escribir (como si releyeras)
    await randomDelay(2000, 4000);

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
