import {Injectable,inject} from '@angular/core';
import {TravelDataService,TravelRecord,Row} from '../../../../data/facades/travel-data.service';
import {ResourceDefinition,FieldDefinition} from '../../../../shared/models/resource-definition';
import type {CatalogoAdminKey} from '../../../../data/queries/catalogos-admin.service';
import {destinationCatalogPayload,destinationSlug} from '../../../destinations/models/destination-catalog-payload';
@Injectable({providedIn:'root'})
export class ResourceService {
 data=inject(TravelDataService);
 async options(fields:FieldDefinition[]){return Promise.all(fields.map(async f=>{if(!f.ref)return f;const rows=await this.data.cached('options:'+f.ref,async()=>{
  switch(f.ref){case 'hotel-destinations':return [];case 'destinations':{const r=await this.data.backend.client.from('catalogo_destinos').select('id,nombre').eq('activo',true).order('nombre');if(r.error)throw r.error;return r.data||[];}case 'areas':return this.data.destinations.obtenerConfiguracionGeografica('divisiones-area');case 'tour-types':return this.data.destinations.obtenerTiposTuristicosCatalogo(true);case 'continents':return this.data.destinations.continentes().then(r=>{if(r.error)throw r.error;return r.data||[];});case 'regimes':return this.data.legacy.obtenerRegimenesAdmin();case 'company-roles':return this.data.employees.rolesEmpresaAdmin().then(r=>{if(r.error)throw r.error;return r.data||[];});case 'employee-status':return this.data.employees.obtenerEstatusEmpleadoAdmin();case 'treatments':return this.data.legacy.obtenerTratamientosActivos();case 'activities':return this.data.catalogs.obtenerCatalogoAdmin('actividades');case 'room-types':return this.data.catalogs.obtenerCatalogoAdmin('tipos_habitacion');default:return [];}
 },300_000);return{...f,options:rows.map((r:any)=>({value:r.id,label:r.nombre||r.descripcion||r.rol||r.nombre_habitacion||String(r.id)}))};}));}
 async detail(kind:string,record:TravelRecord):Promise<Row>{
 if(kind==='destinos')return await this.data.destinations.obtenerCatalogoDestinoAdmin(Number(record.id))||record.raw;
 if(kind==='hoteles'){const d:any=await this.data.hotels.infoHotel(Number(record.id),'es');if(!d)throw new Error('No encontramos este hotel.');return{...d,catalogo_destino_id:d.catalogo_destino_id||record.raw['catalogo_destino_id_resuelto'],galleryUrls:(d.imagenes||[]).map((i:any)=>i.url_imagen).join('\n'),activityIds:(d.actividades||[]).map((a:any)=>a.id),regimeIds:(d.regimenes||[]).map((a:any)=>a.id),roomTypeIds:d.tipos_habitacion_ids||[]};}
 if(kind==='circuitos')return await this.data.circuits.infoCircuito(Number(record.id),'es')||record.raw;
 return{...record.raw};}
 async save(def:ResourceDefinition,v:Row,id:string|null,catalog='idiomas'){
 if(!this.data.auth.hasPermission(def.permission))throw new Error('Tu rol no permite guardar estos cambios.');
 const num=(x:any)=>x===''||x==null?null:Number(x),txt=(x:any)=>String(x||'').trim(),n=Number(id);
 switch(def.kind){
  case 'destinos':{
    const payload=destinationCatalogPayload(v);
    if(id)await this.data.destinations.actualizarCatalogoDestinoAdmin(n,payload);
    else await this.data.destinations.crearCatalogoDestinoAdmin({...payload,slug:destinationSlug(payload.nombre)});
    break;
  }
 case 'hoteles':{const existing:Row[]=v['imagenes']||[],urls=txt(v['galleryUrls']).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);const images=urls.map(url=>{const e=existing.find(i=>i['url_imagen']===url);return{id:e?.['id']||null,url_imagen:url,tipo_imagen_id:e?.['tipo_imagen_id']||null};});const removed=existing.filter(i=>!urls.includes(i['url_imagen'])).map(i=>({...i,eliminar:true}));const translations=(v['traducciones']||[]).filter((t:any)=>t.idioma_id!==1);translations.push({idioma_id:1,nombre_hotel:txt(v['nombre_hotel']),descripcion:txt(v['descripcion'])||null,plan_todo_incluido:v['traducciones']?.find((t:any)=>t.idioma_id===1)?.plan_todo_incluido||null});const payload={nombre_hotel:txt(v['nombre_hotel']),descripcion:txt(v['descripcion'])||null,orden:num(v['orden']),estrellas:num(v['estrellas']),fondo:txt(v['fondo'])||null,ubicacion:txt(v['ubicacion'])||null,destino_id:num(v['destino_id']),catalogo_destino_id:num(v['catalogo_destino_id']),descuento_id:num(v['descuento_id']),regimen_id:num(v['regimen_id']),regimen_ids:v['regimeIds']||[],actividad_ids:v['activityIds']||[],room_type_ids:v['roomTypeIds']||[],horarios:v['horarios']||null,imagenes:[...images,...removed] as any,traducciones:translations};if(id)await this.data.legacy.actualizarHotelDetalleAdmin({...payload,hotelId:n});else await this.data.legacy.crearHotelDetalleAdmin(payload);break;}
 case 'clientes':{const payload={nombre:txt(v['nombre']),nombre_completo:txt(v['nombre_completo'])||txt(v['nombre']),tratamiento_id:num(v['tratamiento_id']),email:txt(v['email'])||null,telefono:txt(v['telefono']),recibir_ofertas:!!v['recibir_ofertas']};if(id){const r=await this.data.backend.client.from('clientes').update(payload).eq('id',n).select('id').single();if(r.error)throw r.error;}else await this.data.legacy.upsertCliente(payload);break;}
 case 'empleados':{const p={nombre:txt(v['nombre']),cargo_id:num(v['cargo_id']),telefono:txt(v['telefono'])};if(id){await this.data.employees.actualizarEmpleadoAdmin(n,p);if(v['estatus_id'])await this.data.employees.actualizarEstatusEmpleadoAdmin(n,Number(v['estatus_id']));}else await this.data.employees.crearEmpleadoAdmin(p);break;}
 case 'circuitos':{const p={nombre:txt(v['nombre']),descripcion:txt(v['descripcion']),precio_total:Number(v['precio_total'])||0,duracion_dias:Number(v['duracion_dias'])||1,duracion_noches:Number(v['duracion_noches'])||0,imagen_principal:txt(v['imagen_principal']),activo:v['activo']!==false,destinos:v['destinos']||[],hoteles:v['hoteles']||[],actividades:v['actividades']||[],imagenes:v['imagenes']||[],traducciones:v['traducciones']||[]};if(id)await this.data.circuits.actualizarCircuito(n,p);else await this.data.circuits.crearCircuito(p);break;}
 case 'configuracion':if(id)await this.data.employees.actualizarRolAdmin(n,{key:txt(v['key']),name:txt(v['name'])});else await this.data.employees.crearRolAdmin({key:txt(v['key']),name:txt(v['name'])});break;
 case 'catalogos':case 'atracciones':{
 const key=(def.kind==='atracciones'?'atracciones':catalog) as CatalogoAdminKey;
 let payload=v;
 if(key==='meses_disponibles'){
   const meses=Number(v['meses']);
   if(!Number.isInteger(meses)||meses<1)throw new Error('Captura un número de meses entero mayor que cero.');
   payload={meses,activo:v['activo']!==false};
 }
 if(id)await this.data.catalogs.actualizarCatalogoAdmin(key,n,payload);else await this.data.catalogs.crearCatalogoAdmin(key,payload);break;
 }
 }this.data.invalidate();}
  async remove(def:ResourceDefinition,record:TravelRecord,catalog='idiomas'){
 if(!this.data.auth.hasPermission(def.permission))throw new Error('Tu rol no permite esta acción.');
  const id=Number(record.id);switch(def.kind){case 'destinos':await this.data.destinations.desactivarCatalogoDestinoAdmin(id);break;case 'hoteles':await this.data.hotels.eliminarHotelAdmin(id);break;case 'empleados':await this.data.employees.eliminarEmpleadoAdmin(id);break;case 'circuitos':await this.data.circuits.eliminarCircuito(id);break;case 'configuracion':await this.data.employees.eliminarRolAdmin(id);break;case 'atracciones':case 'catalogos':await this.data.catalogs.eliminarCatalogoAdmin((def.kind==='atracciones'?'atracciones':catalog) as CatalogoAdminKey,id);break;default:throw new Error('Este registro conserva su historial.');}this.data.invalidate();}
  async hotelActive(id:string,active:boolean){
    if(!this.data.auth.hasPermission('hoteles.edit'))throw new Error('Tu rol no permite editar hoteles.');
    const result=await this.data.backend.client.from('hoteles').update({activo:active}).eq('id',Number(id)).select('id').single();
    if(result.error)throw result.error;
    this.data.invalidate();
  }
}
