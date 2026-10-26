import {Injectable,inject} from '@angular/core';import {TravelDataService,Row} from '../../../data/facades/travel-data.service';import {Room,nights,roomDescription,validRooms} from '../models/room';
export interface QuoteDraft {name:string;email:string;phone:string;start:string;end:string;destinationId:number;destinationName:string;rooms:Room[];notes:string;hotels:Array<{id:number;name:string;regimeId:number|null;price:number|null}>;multiple:boolean;employeeId:number|null;language:string;}
@Injectable({providedIn:'root'})
export class QuoteWorkflowService {
 data=inject(TravelDataService);
 async create(draft:QuoteDraft,publicRequest=false){
 if(!publicRequest&&!this.data.auth.hasPermission('cotizaciones.create'))throw new Error('Tu rol no permite crear cotizaciones.');
 if(!draft.name.trim()||!draft.phone.trim()||!nights(draft.start,draft.end)||!validRooms(draft.rooms)||!draft.hotels.length)throw new Error('Revisa los datos del cliente, las fechas, las habitaciones y el hotel.');
 await Promise.all(draft.hotels.map(async hotel=>{
   const configured=await this.data.hotels.obtenerRegimenesCotizacionHotel(hotel.id,draft.language);
   if(configured.length && hotel.regimeId===null)throw new Error(`Selecciona un régimen de alojamiento para ${hotel.name}.`);
   if(hotel.regimeId!==null && !configured.some(regime=>regime.id===hotel.regimeId))throw new Error(`El régimen seleccionado no está configurado para ${hotel.name}. Revisa la selección antes de enviar.`);
 }));
 const employeeId=publicRequest?6:draft.employeeId||this.data.auth.identity()?.employeeId;
 if(!employeeId)throw new Error('Selecciona un asesor para esta solicitud.');
 const client=await this.data.legacy.upsertCliente({nombre:draft.name.trim(),nombre_completo:draft.name.trim(),tratamiento_id:null,email:draft.email.trim()||null,telefono:draft.phone.trim(),recibir_ofertas:false});
 const common={cliente_id:client.id,empleado_id:employeeId,fecha_entrada:draft.start,fecha_salida:draft.end,noches:nights(draft.start,draft.end),habitaciones:roomDescription(draft.rooms),peticiones_especiales:draft.notes.trim()||null};
 let result:any;
 if(draft.multiple)result=await this.data.legacy.guardarCotizacionMultiple({...common,nombre_persona:draft.name.trim(),correo:draft.email.trim()||null,telefono:draft.phone.trim(),destino_id:draft.destinationId,total_personas:draft.rooms.reduce((n,r)=>n+r.adults+r.children,0),total_habitaciones:draft.rooms.length,estatus_clave:'pendiente',hoteles:draft.hotels.map((h,i)=>({hotel_id:h.id,hotel_nombre:h.name,regimen_id:h.regimeId,destino_id:null,catalogo_destino_id:draft.destinationId,destino_nombre:draft.destinationName,orden:i+1,es_principal:i===0,precio:h.price}))});
 else result=await this.data.legacy.crearSolicitudCotizacion({...common,hotel_id:draft.hotels[0].id,regimen_id:draft.hotels[0].regimeId,idioma:draft.language,recibir_ofertas:false});
 if(!result?.public_id)throw new Error('La solicitud se registró, pero no pudimos recuperar su enlace. Consulta el listado antes de volver a crearla.');
 this.data.invalidate();return result;
 }
}
