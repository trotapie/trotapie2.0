import {Injectable, inject} from '@angular/core';
import {FunctionsHttpError} from '@supabase/supabase-js';
import {ClientService} from '../../../core/services/client.service';
import {COPY_LANGUAGES, type CopyBlock} from '../../../../../supabase/functions/_shared/quote-copy';

export interface QuoteCopySnapshot {textos: CopyBlock; version: number}
const section = 'cotizacion';
const cachePrefix = 'quote-copy:';

@Injectable({providedIn: 'root'})
export class QuoteCopyService {
  private readonly backend = inject(ClientService);

  async loadOriginal(): Promise<QuoteCopySnapshot> {
    const {data, error} = await this.backend.client.from('textos_configurables')
      .select('textos,version').eq('seccion', section).single();
    if (error) throw new Error('No pudimos cargar los textos configurables de Cotizaciones.');
    return data;
  }

  loadLanguage(language: string): Promise<CopyBlock> {
    if (language !== 'es' && !COPY_LANGUAGES.some(code => code === language)) return Promise.resolve({});
    return this.backend.cache.get(cachePrefix + language, async () => {
      const query = language === 'es'
        ? this.backend.client.from('textos_configurables').select('textos').eq('seccion', section)
        : this.backend.client.from('textos_configurables_traducciones').select('textos').eq('seccion', section).eq('idioma', language);
      const {data, error} = await query.maybeSingle();
      if (error) throw error;
      return data?.textos ?? {};
    }, 0); // Deduplicate in-flight requests without caching an old or missing published translation.
  }

  async save(snapshot: QuoteCopySnapshot): Promise<QuoteCopySnapshot> {
    const {data, error} = await this.backend.client.functions.invoke<QuoteCopySnapshot>(
      'guardar-textos-cotizacion', {body: snapshot},
    );
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null);
      if (typeof body?.error === 'string') throw new Error(body.error);
    }
    if (error || !data) throw new Error('No pudimos confirmar el guardado de los textos. Intenta de nuevo.');
    this.backend.cache.invalidate(cachePrefix);
    return data;
  }
}
