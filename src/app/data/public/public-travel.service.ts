import { Injectable, inject, Injector } from '@angular/core';
import { ClientService } from '../../core/services/client.service';
import { LanguageService } from '../../core/services/language.service';
import { Page, PAGE_SIZE, normalizeRecord, Row } from '../models/travel-record';
import { randomSample } from '../../core/utils/random-sample';
import {InternationalCountry} from '../models/international-geography';
const HOTEL_COLUMNS =
  'id,estrellas,fondo,orden,ubicacion,traducciones:hotel_traducciones(idioma_id,nombre_hotel,descripcion),catalogoDestino:catalogo_destino_id!inner(id,nombre)';

@Injectable({ providedIn: 'root' })
export class PublicTravelService {
  backend = inject(ClientService);
  language = inject(LanguageService);
  private injector = inject(Injector);
  cached<T>(key: string, load: () => Promise<T>, ttl = 120_000) {
    return this.backend.cache.get('public:' + this.language.language() + ':' + key, load, ttl);
  }
  hotels = {
    infoHotel: async (id: number, lang: string) => {
      const { HotelesService } = await import('../queries/hoteles.service');
      return this.injector.get(HotelesService).infoHotel(id, lang);
    },
  };
  destinations = {
    obtenerDetalleDestino: async (id: number, lang: string) => {
      const { DestinosService } = await import('../queries/destinos.service');
      return this.injector.get(DestinosService).obtenerDetalleDestino(id, lang);
    },
  };
  circuits = {
    listCircuitosPublicos: async (lang: string) => {
      const { CircuitosService } = await import('../queries/circuitos.service');
      return this.injector.get(CircuitosService).listCircuitosPublicos(lang);
    },
    infoCircuito: async (id: number, lang: string) => {
      const { CircuitosService } = await import('../queries/circuitos.service');
      return this.injector.get(CircuitosService).infoCircuito(id, lang);
    },
  };
  coverImages() {
    return this.cached(
      'cover',
      async () => {
        const { data, error } = await this.backend.client
          .from('imagenes_fondo')
          .select(
            'id,url_imagen,nombre_destino,traducciones:imagenes_fondo_traducciones(nombre_destino,idioma:idioma_id(codigo))',
          )
          .eq('activo', true)
          .order('id');
        if (error) throw error;
        return (data || []).map((r: any) => ({
          ...r,
          nombre_destino:
            r.traducciones?.find((t: any) => t.idioma?.codigo === this.language.language())
              ?.nombre_destino ||
            r.traducciones?.find((t: any) => t.idioma?.codigo === 'es')?.nombre_destino ||
            r.nombre_destino,
        }));
      },
      300_000,
    );
  }
  async publicDestinations(
    type: 'NACIONAL' | 'INTERNACIONAL' = 'NACIONAL',
    page = 0,
    search = '',
    experience: number | null = null,
    regionId:number|null=null,
    countryId:number|null=null,
  ): Promise<Page> {
    return this.cached(`destinations:${type}:${page}:${search}:${experience}:${regionId}:${countryId}`, async () => {
      let query = this.backend.client
        .from(
          type === 'NACIONAL'
            ? 'v_catalogo_nacionales_destinos_admin'
            : 'v_catalogo_internacional_destinos_admin',
        )
        .select(
          'destino_id,destino_nombre,division_area_nombre,pais_nombre,tipo_turistico_nombre,imagen_destino,activo',
          { count: 'exact' },
        )
        .eq('activo', true)
        .order('destino_prioridad', { ascending: true, nullsFirst: false })
        .order('destino_orden', { ascending: true, nullsFirst: false })
        .order('destino_nombre')
        .order('destino_id');
      if (search.trim())
        query = query.ilike('destino_nombre', `%${search.replace(/[%_,]/g, '').trim()}%`);
      if (experience) query = query.eq('tipo_turistico_id', experience);
      if(type==='INTERNACIONAL'){if(regionId)query=query.eq('region_id',regionId);if(countryId)query=query.eq('pais_id',countryId);}
      const { data, error, count } = await query.range(
        page * PAGE_SIZE,
        (page + 1) * PAGE_SIZE - 1,
      );
      if (error) throw error;
      return {
        items: (data || []).map((r) => ({ ...normalizeRecord(r, 'destinos'), status: '' })),
        total: count || 0,
        page,
      };
    });
  }
  async internationalGeography(experienceId:number):Promise<InternationalCountry[]> {
    return this.cached('international-geography:' + experienceId,async()=>{
      const countries=new Map<number,InternationalCountry>();
      for(let offset=0;;offset+=500){
        const {data,error}=await this.backend.client.from('v_catalogo_internacional_destinos_admin').select('destino_id,pais_id,pais_nombre,region_id,region_nombre').eq('activo',true).eq('tipo_turistico_id',experienceId).order('destino_id').range(offset,offset+499);
        if(error)throw error;
        for(const row of data||[]){if(row.pais_id&&row.region_id)countries.set(Number(row.pais_id),{id:Number(row.pais_id),name:String(row.pais_nombre),regionId:Number(row.region_id),regionName:String(row.region_nombre)});}
        if((data?.length||0)<500)break;
      }
      return [...countries.values()].sort((a,b)=>a.name.localeCompare(b.name,'es'));
    },300_000);
  }
  async experienceOptions(type: 'NACIONAL' | 'INTERNACIONAL' = 'NACIONAL'): Promise<Array<{id:number;slug:string;nombre:string;label:string}>> {
    return this.cached('public-experience-options:' + type, async () => {
      const [types, translations, available] = await Promise.all([
        this.backend.client.from('catalogo_tipos_turisticos').select('id,slug,nombre').eq('activo',true).order('orden').order('id'),
        this.backend.client.from('catalogo_tipos_turisticos_traducciones').select('tipo_turistico_id,nombre,idioma:idiomas(codigo)'),
        this.availableExperienceIds(type),
      ]);
      if(types.error) throw types.error;
      if(translations.error) throw translations.error;
      const names = new Map((translations.data || [])
        .filter((item:any)=>item.idioma?.codigo===this.language.language())
        .map((item:any)=>[Number(item.tipo_turistico_id),String(item.nombre || '').trim()]));
      return (types.data||[]).filter(item=>available.has(Number(item.id))).map((item:any)=>({id:Number(item.id),slug:String(item.slug||''),nombre:String(item.nombre||''),label:names.get(Number(item.id)) || String(item.nombre||'')}));
    });
  }
  private async availableExperienceIds(type: 'NACIONAL' | 'INTERNACIONAL'): Promise<Set<number>> {
    const ids = new Set<number>();
    const view = type === 'NACIONAL' ? 'v_catalogo_nacionales_destinos_admin' : 'v_catalogo_internacional_destinos_admin';
    for (let offset=0;;offset+=500) {
      const {data,error} = await this.backend.client.from(view)
        .select('destino_id,tipo_turistico_id').eq('activo',true)
        .order('destino_id').range(offset,offset+499);
      if (error) throw error;
      for (const item of data || []) {
        const id = Number(item.tipo_turistico_id);
        if (Number.isSafeInteger(id) && id>0) ids.add(id);
      }
      if ((data?.length || 0)<500) break;
    }
    return ids;
  }
  async experienceId(slug:string): Promise<number|null> {
    const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,'-');
    const wanted=normalize(slug);
    const aliases=wanted==='playas'?['playa','playas']: [wanted];
    const item=(await this.experienceOptions()).find(option=>aliases.includes(normalize(option.slug))||aliases.includes(normalize(option.nombre)));
    return item?.id ?? null;
  }
  async hotelRegimeOptions(){return this.cached('hotel-regime-options',async()=>{const [result,languageId]=await Promise.all([this.backend.client.from('regimen').select('id,traducciones:regimen_traducciones(idioma_id,descripcion)'),this.hotelLanguageId()]);if(result.error)throw result.error;return (result.data||[]).map((item:any)=>({value:Number(item.id),label:item.traducciones?.find((t:any)=>t.idioma_id===languageId)?.descripcion||item.traducciones?.find((t:any)=>t.idioma_id===1)?.descripcion||''})).filter(item=>item.label);});}
  async hotelPage(id: number, page = 0, pageSize = 10, filters:{search:string;starsMin:number|null;starsMax:number|null;regime:number|null}={search:'',starsMin:null,starsMax:null,regime:null}): Promise<Page> {
    return this.cached('hotels:' + id + ':' + page + ':' + pageSize + ':' + JSON.stringify(filters), async () => {
      const languageId=await this.hotelLanguageId();
      const columns=filters.search.trim()?HOTEL_COLUMNS.replace('traducciones:hotel_traducciones(', 'traducciones:hotel_traducciones!inner('):HOTEL_COLUMNS;
      let query=this.backend.client.from('hoteles').select(columns+(filters.regime?',regimenes:regimen_hotel!inner(regimen_id)':''),{count:'exact'}).eq('catalogo_destino_id',id);
      if(filters.search.trim())query=query.ilike('traducciones.nombre_hotel','%'+filters.search.replace(/[%_,]/g,'').trim()+'%').eq('traducciones.idioma_id',languageId);
      if(filters.starsMin!==null)query=query.gte('estrellas',filters.starsMin);
      if(filters.starsMax!==null)query=query.lte('estrellas',filters.starsMax);
      if(filters.regime!==null)query=query.eq('regimenes.regimen_id',filters.regime);
      const result=await query.order('orden').order('id').range(page*pageSize,(page+1)*pageSize-1);
      if (result.error) throw result.error;
      return {
        items: this.normalizeHotels(result.data || [], languageId),
        total: result.count || 0,
        page,
      };
    });
  }

  /** Cache the small ID pool; retrieve translated details for just the four chosen hotels. */
  async featuredHotels(destinationId: number): Promise<Page> {
    const ids = await this.backend.cache.get(
      'public:hotel-ids:' + destinationId,
      async () => {
        const pool: number[] = [];
        const batchSize = 1000;
        for (let from = 0; ; from += batchSize) {
          const result = await this.backend.client
            .from('hoteles')
            .select('id', { count: 'exact' })
            .eq('catalogo_destino_id', destinationId)
            .order('id')
            .range(from, from + batchSize - 1);
          if (result.error) throw result.error;
          pool.push(...(result.data || []).map((row) => Number(row.id)));
          if (!result.data?.length || pool.length >= (result.count ?? pool.length)) break;
        }
        return pool;
      },
      120_000,
    );
    const selected = randomSample(ids, 4);
    if (!selected.length) return { items: [], total: 0, page: 0 };
    const [result, languageId] = await Promise.all([
      this.backend.client
        .from('hoteles')
        .select(HOTEL_COLUMNS)
        .eq('catalogo_destino_id', destinationId)
        .in('id', selected),
      this.hotelLanguageId(),
    ]);
    if (result.error) throw result.error;
    const records = new Map(
      this.normalizeHotels(result.data || [], languageId).map((record) => [
        Number(record.id),
        record,
      ]),
    );
    return {
      items: selected.flatMap((id) => (records.get(id) ? [records.get(id)!] : [])),
      total: ids.length,
      page: 0,
    };
  }

  private hotelLanguageId() {
    return this.cached(
      'language-id',
      async () => {
        if (this.language.language() === 'es') return 1;
        const result = await this.backend.client
          .from('idiomas')
          .select('id')
          .eq('codigo', this.language.language())
          .maybeSingle();
        if (result.error) throw result.error;
        return result.data?.id || 1;
      },
      300_000,
    );
  }

  private normalizeHotels(rows: Row[], languageId: number) {
    return rows.map((row) => {
      const translation =
        row['traducciones']?.find((t: Row) => t['idioma_id'] === languageId) ||
        row['traducciones']?.find((t: Row) => t['idioma_id'] === 1);
      return normalizeRecord(
        {
          ...row,
          nombre_hotel: translation?.nombre_hotel,
          descripcion: translation?.descripcion,
          destino_nombre: row['catalogoDestino']?.nombre,
        },
        'hoteles',
      );
    });
  }
}

