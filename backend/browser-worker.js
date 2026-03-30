async function runBrowserTask({ url, actions }) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'es-MX,es;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });

    if (!response.ok) {
      if (response.status === 403 || response.status === 401) {
        return { results: [{ action: 'getPageText', text: '403 Forbidden - CloudFront bloqueó la solicitud' }] };
      }
      return { results: [{ action: 'getPageText', text: 'Error HTTP: ' + response.status }] };
    }

    const html = await response.text();
    
    // Extracción de etiquetas principales (Títulos y Textos P de Párrafos simples sin meter todo el HTML ruidoso)
    const titles = [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/g)]
      .map(m => m[1].replace(/<[^>]+>/g, '').trim())
      .filter(t => t.length > 10);
      
    const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)]
      .map(m => m[1].replace(/<[^>]+>/g, '').trim())
      .filter(p => p.length > 20);

    const mergedText = [...titles, ...paragraphs].join('\n\n');

    // Extraer título real del Head
    const headTitleMatch = html.match(/<title>([\s\S]*?)<\/title>/);
    const pageTitle = headTitleMatch ? headTitleMatch[1] : '';

    return {
      metadata: { title: pageTitle },
      results: [
        { 
          action: 'getPageText', 
          text: mergedText.length > 100 ? mergedText : html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') 
        }
      ]
    };
  } catch (error) {
    return { results: [{ action: 'getPageText', text: 'Error de red en browser-worker: ' + error.message }] };
  }
}

export { runBrowserTask };
