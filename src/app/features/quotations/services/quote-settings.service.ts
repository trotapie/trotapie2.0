import {Injectable,inject} from '@angular/core';
import {ClientService} from '../../../core/services/client.service';
import {QuoteRoomLimits} from '../models/room';

@Injectable({providedIn:'root'})
export class QuoteSettingsService {
  private backend=inject(ClientService);
  async save(limits:QuoteRoomLimits):Promise<QuoteRoomLimits>{
    if(![limits.maxRooms,limits.maxPeoplePerRoom].every(value=>Number.isInteger(value)&&value>=1&&value<=2147483647))throw new Error('Los límites deben ser números enteros mayores que cero y no superar 2147483647.');
    const {data,error}=await this.backend.client.from('configuracion_cotizaciones').update({max_habitaciones:limits.maxRooms,max_personas_por_habitacion:limits.maxPeoplePerRoom}).eq('id',1).select('max_habitaciones,max_personas_por_habitacion').single();
    if(error||!data)throw new Error('No pudimos guardar la configuración. Verifica tu acceso de administrador y que scripts/configuracion-cotizaciones.sql esté aplicado en Supabase.');
    return {maxRooms:data.max_habitaciones,maxPeoplePerRoom:data.max_personas_por_habitacion};
  }
  async load():Promise<QuoteRoomLimits>{
    const {data,error}=await this.backend.client.from('configuracion_cotizaciones').select('max_habitaciones,max_personas_por_habitacion').eq('id',1).single();
    if(error)throw new Error('No pudimos cargar los límites de habitaciones. Revisa la configuración de cotizaciones en la base de datos.');
    if(!Number.isInteger(data.max_habitaciones)||data.max_habitaciones<1||!Number.isInteger(data.max_personas_por_habitacion)||data.max_personas_por_habitacion<1)throw new Error('La configuración de habitaciones no es válida.');
    return {maxRooms:data.max_habitaciones,maxPeoplePerRoom:data.max_personas_por_habitacion};
  }
}
