// Deploy as a web app (execute as owner). Set QUOTE_TRANSLATION_SCRIPT_SECRET in Script Properties.
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const secret = PropertiesService.getScriptProperties().getProperty('QUOTE_TRANSLATION_SCRIPT_SECRET');
    if (!secret || body.secreto !== secret) return quoteJson({ok: false});
    const languages = ['en', 'fr', 'de', 'pt'];
    if (body.idiomaOrigen !== 'es' || JSON.stringify(body.idiomasDestino) !== JSON.stringify(languages)) {
      return quoteJson({ok: false});
    }
    const traducciones = Object.fromEntries(languages.map(lang => [lang, {}]));
    const cache = Object.fromEntries(languages.map(lang => [lang, new Map()]));
    for (const [group, fields] of Object.entries(body.textos)) {
      for (const [key, text] of Object.entries(fields)) {
        for (const lang of languages) {
          if (!cache[lang].has(text)) cache[lang].set(text, LanguageApp.translate(text, 'es', lang));
          if (!traducciones[lang][group]) traducciones[lang][group] = {};
          traducciones[lang][group][key] = cache[lang].get(text);
        }
      }
    }
    return quoteJson({ok: true, traducciones});
  } catch (_) {
    return quoteJson({ok: false});
  }
}

function quoteJson(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
