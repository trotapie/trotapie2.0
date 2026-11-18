import {createClient} from 'npm:@supabase/supabase-js@2.56.0';
import {changedCopy, cleanCopy, COPY_LANGUAGES, mergeCopyTranslations, QUOTE_COPY, type CopyBlock} from '../_shared/quote-copy.ts';
import {HOME_COPY} from '../_shared/home-copy.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (status: number, body: unknown) =>
  Response.json(body, {status, headers: cors});

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers: cors});
  if (request.method !== 'POST') return reply(405, {error: 'Método no permitido.'});
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return reply(401, {error: 'Inicia sesión.'});

  const url = Deno.env.get('SUPABASE_URL')!;
  const user = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: {headers: {Authorization: authorization}},
  });
  const {data: identity, error: authError} = await user.auth.getUser(authorization.slice(7));
  if (authError || !identity.user) return reply(401, {error: 'Tu sesión expiró.'});
  const {data: allowed, error: permissionError} = await user.rpc('es_administrador_actual');
  if (permissionError || allowed !== true) return reply(403, {error: 'No tienes permiso para editar estos textos.'});

  let next: CopyBlock;
  let version: number;
  let section: 'cotizacion' | 'inicio';
  let defaults: CopyBlock;
  try {
    const raw = await request.text();
    if (raw.length > 48_000) return reply(413, {error: 'El bloque de textos es demasiado grande.'});
    const body = JSON.parse(raw);
    section = body.seccion === undefined ? 'cotizacion' : body.seccion;
    if (section !== 'cotizacion' && section !== 'inicio') throw new Error('La sección no es válida.');
    defaults = section === 'inicio' ? HOME_COPY : QUOTE_COPY;
    if (!Number.isInteger(body.version) || body.version < 0) throw new Error('La versión no es válida.');
    version = body.version;
    next = cleanCopy(body.textos, defaults);
  } catch (error) {
    return reply(400, {error: error instanceof SyntaxError ? 'El bloque de textos no es válido.' : (error as Error).message});
  }

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const current = await admin.from('textos_configurables').select('textos,version').eq('seccion', section).single();
  if (current.error) return reply(500, {error: 'No pudimos leer la configuración de los textos.'});
  const conflict = () => reply(409, {error: 'Otro usuario guardó cambios. Copia tus cambios antes de recargar la página.'});
  if (current.data.version !== version) return conflict();
  const saved = await admin.from('textos_configurables_traducciones').select('idioma,textos').eq('seccion', section);
  if (saved.error) return reply(500, {error: 'No pudimos leer las traducciones actuales.'});

  let translations: Record<string, CopyBlock>;
  try {
    const changed = changedCopy(cleanCopy(current.data.textos, defaults), next);
    const previous = new Map(saved.data.map(row => [row.idioma, cleanCopy(row.textos, defaults)]));
    // Repair missing translations as well, without re-translating complete unchanged keys.
    for (const [group, fields] of Object.entries(next))
      for (const [key, text] of Object.entries(fields))
        if (COPY_LANGUAGES.some(lang => !previous.get(lang)?.[group]?.[key]))
          (changed[group] ??= {})[key] = text;

    let result: Record<string, unknown> = {};
    if (Object.keys(changed).length) {
      const scriptUrl = Deno.env.get('QUOTE_TRANSLATION_SCRIPT_URL');
      const secreto = Deno.env.get('QUOTE_TRANSLATION_SCRIPT_SECRET');
      if (!scriptUrl || !secreto) return reply(503, {error: 'El servicio de traducción aún no está configurado.'});
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({secreto, idiomaOrigen: 'es', idiomasDestino: COPY_LANGUAGES, textos: changed}),
        signal: AbortSignal.timeout(45_000),
      });
      if (!response.ok) throw new Error('Translation HTTP error');
      const body = await response.json();
      if (!body.ok || !body.traducciones) throw new Error('Translation failed');
      result = body.traducciones;
    }
    translations = Object.fromEntries(COPY_LANGUAGES.map(lang => [
      lang, mergeCopyTranslations(next, changed, previous.get(lang) ?? {}, cleanCopy(result[lang] ?? {}, defaults)),
    ]));
  } catch {
    return reply(502, {error: 'No pudimos generar todas las traducciones. No se publicó ningún cambio; intenta de nuevo.'});
  }

  const published = await admin.rpc(section === 'inicio' ? 'publicar_textos_inicio' : 'publicar_textos_cotizacion', {
    p_version: version, p_textos: next, p_traducciones: translations,
  });
  if (published.error?.code === '40001') return conflict();
  if (published.error) return reply(500, {error: 'No pudimos publicar los textos. Intenta de nuevo.'});
  return reply(200, {textos: next, version: published.data});
});
