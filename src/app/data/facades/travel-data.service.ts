import { Injectable, inject } from '@angular/core';
import { ClientService } from '../../core/services/client.service';
import { AuthService } from '../../core/services/auth.service';
import { SupabaseService } from '../queries/supabase.service';
import { DestinosService } from '../queries/destinos.service';
import type {FiltrosDestinoCatalogo} from '../queries/destinos.service';
import { HotelesService } from '../queries/hoteles.service';
import { CotizacionesService } from '../queries/cotizaciones.service';
import { ClientesService } from '../queries/clientes.service';
import { EmpleadosService } from '../queries/empleados.service';
import { CatalogosAdminService, CatalogoAdminKey } from '../queries/catalogos-admin.service';
import { CircuitosService } from '../queries/circuitos.service';
import { LanguageService } from '../../core/services/language.service';
import {QuoteFilters,emptyQuoteFilters,quoteDateBounds} from '../../features/quotes/models/quote-filters';
import { summarizeDashboard } from '../models/dashboard-statistics';
import {hotelCatalogFilters,hotelStatusColumnAvailable,activeHotelDestinationOptions,hasHotelDestination,type HotelExtraFilters} from '../utils/hotel-catalog-filters';

import {Row,TravelRecord,Page,PAGE_SIZE,normalizeRecord} from '../models/travel-record';
import {employeeAccessLabel,filterEmployees} from '../../features/employees/models/employee-management';
export type {Row,TravelRecord,Page} from '../models/travel-record';
export {PAGE_SIZE,normalizeRecord} from '../models/travel-record';

@Injectable({ providedIn: 'root' })
export class TravelDataService {
  readonly backend = inject(ClientService);
  readonly auth = inject(AuthService);
  readonly legacy = inject(SupabaseService);
  readonly destinations = inject(DestinosService);
  readonly hotels = inject(HotelesService);
  readonly quotes = inject(CotizacionesService);
  readonly clients = inject(ClientesService);
  readonly employees = inject(EmpleadosService);
  readonly catalogs = inject(CatalogosAdminService);
  readonly circuits = inject(CircuitosService);
  readonly language = inject(LanguageService);
  private key(name: string) { return `${this.auth.identity()?.id || 'public'}:${this.language.language()}:${name}`; }
  cached<T>(name: string, load: () => Promise<T>, ttl = 60_000) { return this.backend.cache.get(this.key(name), load, ttl); }
  invalidate() { this.backend.cache.clear(); }
  hotelStatusAvailable(){if(!this.auth.identity())return Promise.resolve(false);return this.cached('hotel-status-schema',async()=>{
    const {error}=await this.backend.client.from('v_hoteles_gestion_admin').select('activo').limit(0);
    if(error&&['42P01','42703','PGRST205','PGRST204'].includes(error.code))return false;
    if(error)throw error;
    return true;
  });}
  async activeHotelDestinations(type:'NACIONAL'|'INTERNACIONAL'){
    return activeHotelDestinationOptions(page=>this.publicDestinations(type,page));
  }
  async hotelAdminPage(page=0,search='',destinationId?:number,status='',activeDestinationIds?:number[],extras:HotelExtraFilters={}):Promise<Page>{
    if(!hasHotelDestination(destinationId))return {items:[],total:0,page};
    if(activeDestinationIds&&(!activeDestinationIds.length||destinationId&&!activeDestinationIds.includes(destinationId)))return {items:[],total:0,page};
    const available=await this.hotelStatusAvailable();
    return this.cached(`hotel-admin:${page}:${search}:${destinationId||''}:${status}:${available}:${activeDestinationIds?.join(',')??'all'}:${JSON.stringify(extras)}`,async()=>{
      let query=this.backend.client.from(available?'v_hoteles_gestion_admin':'v_hoteles_catalogo_admin').select('*',{count:'exact'});
      query=hotelCatalogFilters(query,search,destinationId,status,available,extras);
      if(extras.sort==='nombre-asc'||extras.sort==='nombre-desc')query=query.order('nombre_hotel',{ascending:extras.sort==='nombre-asc'});
      else query=query.order('orden',{ascending:extras.sort!=='orden-desc'});
      query=query.order('id');
      if(activeDestinationIds)query=query.in('catalogo_destino_id_resuelto',activeDestinationIds);
      if(extras.stars){
        const ids:number[]=[];
        for(let offset=0;;offset+=1000){
          const matches=await this.backend.client.from('hoteles').select('id').eq('catalogo_destino_id',destinationId!).eq('estrellas',extras.stars).order('id').range(offset,offset+999);
          if(matches.error)throw matches.error;
          ids.push(...(matches.data||[]).map(row=>Number(row.id)));
          if((matches.data?.length||0)<1000)break;
        }
        if(!ids.length)return {items:[],total:0,page};
        query=query.in('id',ids);
      }
      const {data,count,error}=await query.range(page*PAGE_SIZE,(page+1)*PAGE_SIZE-1);
      if(error)throw error;
      let rows:Row[]=data||[];
      if(!available&&rows.length){
        const result=await this.backend.client.from('hoteles').select('id,fondo').in('id',rows.map(row=>row['id']));
        if(result.error)throw result.error;
        const photos=new Map((result.data||[]).map(row=>[row.id,row.fondo]));
        rows=rows.map(row=>({...row,fondo:photos.get(row['id'])}));
      }
      return {items:rows.map(row=>normalizeRecord({...row,destino_nombre:row['catalogo_destino_nombre_resuelto']||'Sin destino asignado'},'hoteles')),total:count||0,page};
    });
  }
  async coverImages() { return this.cached('cover', () => this.legacy.getImagenesFondo(this.language.language()), 300_000); }
  async publicDestinations(type: 'NACIONAL' | 'INTERNACIONAL' = 'NACIONAL', page = 0, search = ''): Promise<Page> {
    return this.cached(`destinations:${type}:${page}:${search}`, async () => {
      const view = type === 'NACIONAL' ? 'v_catalogo_nacionales_destinos_admin' : 'v_catalogo_internacional_destinos_admin';
      let query = this.backend.client.from(view).select('destino_id, destino_nombre, division_area_nombre, pais_nombre, tipo_turistico_nombre, imagen_destino, activo', { count: 'exact' }).eq('activo', true).order('destino_prioridad', { ascending: true, nullsFirst: false }).order('destino_orden', { ascending: true, nullsFirst: false }).order('destino_nombre').order('destino_id');
      if (search.trim()) query = query.ilike('destino_nombre', `%${search.replace(/[%_,]/g, '').trim()}%`);
      const { data, count, error } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      return { items: (data || []).map(r => normalizeRecord(r, 'destinos')), total: count || 0, page };
    }, 120_000);
  }
  async hotelPage(destinationId: number, page = 0): Promise<Page> {
    return this.cached(`hotels:${destinationId}:${page}`, async () => {
      let query=this.backend.client.from('hoteles').select('id, estrellas, fondo, orden, ubicacion, traducciones:hotel_traducciones(idioma_id, nombre_hotel, descripcion), catalogoDestino:catalogo_destino_id!inner(id,nombre)', { count: 'exact' }).eq('catalogoDestino.id', destinationId);
      if(await this.cached('hotel-status-column',()=>hotelStatusColumnAvailable(this.backend.client)))query=query.eq('activo',true);
      const { data, count, error } = await query.order('orden').order('id').range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      // Resolve language ids through the established query, not a fixed schema assumption.
      const idiomaId = await this.hotels.getIdiomaId(this.language.language());
      return { items: (data || []).map((r: any) => {
        const t = r.traducciones?.find((t: any) => t.idioma_id === idiomaId) || r.traducciones?.find((t: any) => t.idioma_id === 1);
        return normalizeRecord({ ...r, nombre_hotel: t?.nombre_hotel, descripcion: t?.descripcion, destino_nombre: r.catalogoDestino?.nombre }, 'hoteles');
      }), total: count || 0, page };
    });
  }
  async ownQuotePage(page=0,search='',status='',multiple=false,filters:QuoteFilters=emptyQuoteFilters()):Promise<Page>{
    const identity=this.auth.identity();if(!identity)return {items:[],total:0,page};
    if(filters.adviser&&!identity.name.toLocaleLowerCase().includes(filters.adviser.toLocaleLowerCase()))return {items:[],total:0,page};
    const hotelJoin=filters.hotel&&!multiple?'hotel:hoteles!inner(fondo,traducciones:hotel_traducciones!inner(idioma_id,nombre_hotel),destino:catalogo_destinos(nombre))':'hotel:hoteles(fondo,traducciones:hotel_traducciones(idioma_id,nombre_hotel),destino:catalogo_destinos(nombre))';
    const columns=multiple?'id,public_id,empleado_id,created_at,nombre_persona,correo,telefono,estatus_clave':`id,public_id,empleado_id,created_at,habitaciones,cliente:clientes!inner(nombre,email,telefono),${hotelJoin},estatus:estatus_cotizacion!inner(nombre)`;
    let query=this.backend.client.from(multiple?'cotizaciones_multiples':'solicitudes_cotizacion').select(columns,{count:'exact'}).eq('empleado_id',identity.employeeId).order('created_at',{ascending:false,nullsFirst:false}).order('id',{ascending:false});
    if(search.trim())query=query.ilike(multiple?'nombre_persona':'cliente.nombre','%'+search.replace(/[%_,]/g,'').trim()+'%');
    if(status)query=query.ilike(multiple?'estatus_clave':'estatus.nombre','%'+status+'%');
    if(filters.client.trim())query=query.ilike(multiple?'nombre_persona':'cliente.nombre','%'+filters.client.replace(/[%_,]/g,'').trim()+'%');
    if(filters.hotel.trim()&&!multiple)query=query.ilike('hotel.traducciones.nombre_hotel','%'+filters.hotel.replace(/[%_,]/g,'').trim()+'%').eq('hotel.traducciones.idioma_id',1);
    const dates=quoteDateBounds(filters);if(dates.start)query=query.gte('created_at',dates.start);if(dates.end)query=query.lt('created_at',dates.end);
    const {data,count,error}=await query.range(page*PAGE_SIZE,(page+1)*PAGE_SIZE-1);if(error)throw error;
    return {items:(data||[]).map((row:any)=>normalizeRecord({...row,cliente_nombre:row.cliente?.nombre||row.nombre_persona,cliente_email:row.cliente?.email||row.correo,hotel_nombre:row.hotel?.traducciones?.find((t:any)=>t.idioma_id===1)?.nombre_hotel,destino_nombre:row.hotel?.destino?.nombre,empleado_nombre:identity.name,estatus_nombre:row.estatus?.nombre||row.estatus_clave},'cotizaciones')),total:count||0,page};
  }
  async quotePage(page = 0, search = '', status = '', multiple = false, filters:QuoteFilters=emptyQuoteFilters()): Promise<Page> {
    if(this.auth.identity()?.role!=='admin')return this.ownQuotePage(page,search,status,multiple,filters);
    // The RPC does not expose created_at. Cache the filtered list across pages,
    // enrich it with creation dates, then sort before selecting a page.
    const sorted = await this.cached(`quotes-by-date:${multiple}:${search}:${status}:${JSON.stringify(filters)}`, async () => {
      let query = this.backend.client.rpc(multiple ? 'obtener_cotizaciones_multiples' : 'obtener_solicitudes_cotizacion', {}, { count: 'exact' }).order('id', { ascending: false });
      if (search.trim()) query = query.ilike('cliente_nombre', `%${search.replace(/[%_,]/g, '').trim()}%`);
      if (status) query = query.ilike('estatus_nombre', `%${status}%`);
      for(const [field,value] of [['cliente_nombre',filters.client],['empleado_nombre',filters.adviser],...(!multiple?[['hotel_nombre',filters.hotel]]:[])])if(value.trim())query=query.ilike(field,'%'+value.replace(/[%_,]/g,'').trim()+'%');
      // The existing RPC has no creation date. Restrict it using the underlying records,
      // before counting and paginating, so matches on later pages are not lost.
      if(filters.start||filters.end){
        const ids=await this.cached(`quote-date-ids:${multiple}:${filters.start}:${filters.end}`,async()=>{
          const dates=quoteDateBounds(filters);const ids:number[]=[];
          for(let offset=0;;offset+=500){let lookup=this.backend.client.from(multiple?'cotizaciones_multiples':'solicitudes_cotizacion').select('id').order('id');if(dates.start)lookup=lookup.gte('created_at',dates.start);if(dates.end)lookup=lookup.lt('created_at',dates.end);const result=await lookup.range(offset,offset+499);if(result.error)throw result.error;ids.push(...(result.data||[]).map(row=>Number(row.id)));if((result.data?.length||0)<500)break;}
          return ids;
        },30_000);
        if(!ids.length)return [];
        query=query.in('id',ids);
      }
      const records: Row[] = [];
      for (let offset = 0;; offset += 500) {
        const {data, error} = await query.range(offset, offset + 499);
        if (error) throw error;
        records.push(...((data || []) as Row[]));
        if ((data?.length || 0) < 500) break;
      }
      const ids = records.map(r => Number(r['id'])).filter(Number.isFinite);
      let details: Row[] = [];
      for (let offset = 0; offset < ids.length; offset += 500) {
        const result = await this.backend.client.from(multiple ? 'cotizaciones_multiples' : 'solicitudes_cotizacion').select(multiple ? 'id, created_at, empleado_id' : 'id, created_at, empleado_id, habitaciones').in('id', ids.slice(offset, offset + 500));
        if (result.error) throw result.error;
        details.push(...(result.data || []));
      }
      const byId = new Map(details.map(d => [Number(d['id']), d]));
      const own = this.auth.identity();
      const items = records.map(r => ({ ...r, ...byId.get(Number(r['id'])) })).filter(r => own?.role === 'admin' || r['empleado_id'] === own?.employeeId).map(r => normalizeRecord(r, 'cotizaciones'));
      const timestamp = (record: TravelRecord) => {
        const value = Date.parse(String(record.raw['created_at'] || ''));
        return Number.isFinite(value) ? value : -Infinity;
      };
      return items.sort((a, b) => {
        const first = timestamp(a), second = timestamp(b);
        return first === second ? Number(b.id) - Number(a.id) : first > second ? -1 : 1;
      });
    }, 30_000);
    return {items: sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), total: sorted.length, page};
  }
  async dashboard() {
    return this.cached('dashboard', async () => {
      // Reuse the quotation list's permissions, creation dates and stable ordering.
      // Read every page: rankings must not represent only the five recent rows.
      const first = await this.quotePage();
      const records = [...first.items];
      for (let page = 1; page * PAGE_SIZE < first.total; page++) {
        records.push(...(await this.quotePage(page)).items);
      }
      return summarizeDashboard(records);
    }, 30_000);
  }
  async destinationCatalogPage(filters:FiltrosDestinoCatalogo):Promise<Page>{return this.cached(`destination-catalog:${JSON.stringify(filters)}`,async()=>{const p=await this.destinations.buscarDestinosCatalogo({...filters,pageSize:filters.pageSize??PAGE_SIZE});return {items:p.items.map(r=>normalizeRecord({id:r.destinoId,nombre:r.destinoNombre,division_area_nombre:r.divisionAreaNombre,imagen_destino:r.imagenDestino,activo:r.activo,tipo_turistico_nombre:r.tipoTuristicoNombre||'Sin clasificación',prioridad_label:r.prioridad===1?'Destacado':'Estándar',ubicacion_label:[r.divisionAreaNombre,r.paisNombre,r.regionNombre].filter(Boolean).join(' · ')},'destinos')),total:p.total,page:p.page||0};});}
  async employeePage(page=0,search='',filters:Row={}):Promise<Page>{
    const rows=await this.cached('employee-management',async()=>{
      const [statuses,roles]=await Promise.all([this.employees.obtenerEstatusEmpleadoAdmin(),this.employees.rolesAdmin()]);
      const employees:Row[]=[];
      for(let offset=0;;offset+=500){
        const result=await this.employees.empleados({incluirInhabilitados:true}).range(offset,offset+499);
        if(result.error)throw result.error;
        employees.push(...(result.data||[]));
        if((result.data?.length||0)<500)break;
      }
      let assignments:Record<number,number|null>={};
      // Older deployments may not yet expose the bulk role lookup.
      try{if(employees.length)assignments=await this.employees.rolesEmpleadosAdmin(employees.map(row=>Number(row['id'])));}catch{}
      return employees.map(row=>({...row,
        cargo_label:row['cargo']?.rol||'Sin cargo',
        rol_label:roles.error?'Por confirmar':(roles.data||[]).find(role=>Number(role.id)===Number(assignments[row['id']]))?.name||(row['auth_user_id']?'Por confirmar':'Sin rol'),
        estatus_nombre:statuses.find(status=>Number(status.id)===Number(row['estatus_id']))?.nombre||'Sin estatus',
        estatus_clave:statuses.find(status=>Number(status.id)===Number(row['estatus_id']))?.clave?.trim().toLowerCase()||'',
        acceso_label:employeeAccessLabel(row)
      }));
    });
    const filtered=filterEmployees(rows,search,filters);
    return {items:filtered.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE).map(row=>normalizeRecord(row,'empleados')),total:filtered.length,page};
  }
  async resource(kind: string, page = 0, search = '', catalog = 'idiomas', type:'NACIONAL'|'INTERNACIONAL'='NACIONAL',destinationId?:number): Promise<Page> {
    if(kind==='empleados')return this.employeePage(page,search);
    return this.cached(`resource:${kind}:${page}:${search}:${catalog}:${type}:${destinationId||''}`, async () => {
      if (kind === 'destinos') {
        const p = await this.destinations.buscarDestinosCatalogo({ tipo: type, page, pageSize: PAGE_SIZE, busqueda: search });
        return { items: p.items.map(r => normalizeRecord({ ...r, id: r.destinoId, nombre: r.destinoNombre, division_area_nombre: r.divisionAreaNombre, imagen_destino: r.imagenDestino, activo: r.activo }, kind)), total: p.total, page };
      }
      if (kind === 'hoteles') {
        let query = this.backend.client.from('v_hoteles_catalogo_admin').select('id, orden, regimen_id, legacy_destino_id, catalogo_destino_id_resuelto, catalogo_destino_nombre_resuelto, nombre_hotel, regimen', { count: 'exact' }).order('orden').order('id');
        if (search.trim()) query = query.ilike('nombre_hotel', `%${search.replace(/[%_,]/g, '')}%`);
        if(destinationId)query=query.eq('catalogo_destino_id_resuelto',destinationId);
        const result = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1); if (result.error) throw result.error;
        return { items: (result.data || []).map(r => normalizeRecord({ ...r, destino_nombre: r.catalogo_destino_nombre_resuelto }, kind)), total: result.count || 0, page };
      }
      if (kind === 'clientes') {
        let query = this.backend.client.from('clientes').select('id, nombre, nombre_completo, email, telefono, tratamiento_id, recibir_ofertas', { count: 'exact' }).order('id', { ascending: false });
        if (search.trim()) query = query.ilike('nombre', `%${search.replace(/[%_,]/g, '')}%`);
        const result = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1); if (result.error) throw result.error;
        return { items: (result.data || []).map(r => normalizeRecord(r, kind)), total: result.count || 0, page };
      }
      let rows: Row[] = [];
      if (kind === 'empleados') { const result = await this.employees.empleados({ incluirInhabilitados: true }); if (result.error) throw result.error; rows = result.data || []; }
      if (kind === 'circuitos') rows = await this.circuits.listCircuitosAdmin();
      if (kind === 'catalogos' || kind === 'atracciones') rows = await this.catalogs.obtenerCatalogoAdmin((kind === 'atracciones' ? 'atracciones' : catalog) as CatalogoAdminKey);
      if (kind === 'configuracion') { const result = await this.employees.rolesAdmin(); if (result.error) throw result.error; rows = result.data || []; }
      const filtered = rows.map(r => normalizeRecord(r, kind === 'catalogos' ? catalog : kind)).filter(r => !search || `${r.title} ${r.subtitle}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
      return { items: filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), total: filtered.length, page };
    });
  }
}


