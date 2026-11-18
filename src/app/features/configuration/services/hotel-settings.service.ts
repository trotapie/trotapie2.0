import {Injectable,inject} from '@angular/core';
import {ClientService} from '../../../core/services/client.service';
import {HotelHorarios,normalizarHorarios} from '../../../data/models/hotel-estancia.interface';

@Injectable({providedIn:'root'})
export class HotelSettingsService {
  private readonly backend=inject(ClientService);
  async load():Promise<HotelHorarios>{
    const {data,error}=await this.backend.client.from('configuracion_hoteles').select('horarios').eq('id',1).single();
    if(error||!data)throw new Error('No pudimos cargar los horarios generales. Verifica que la migración de configuración global de hoteles esté aplicada en este ambiente.');
    return normalizarHorarios(data.horarios)||{};
  }
  async save(hours:HotelHorarios):Promise<HotelHorarios>{
    const entries=Object.entries(hours).filter(([,value])=>value!=='');
    const normalized=normalizarHorarios(Object.fromEntries(entries));
    if(entries.length!==Object.keys(normalized||{}).length)throw new Error('Los horarios deben tener el formato HH:mm.');
    const {data,error}=await this.backend.client.from('configuracion_hoteles').update({horarios:normalized}).eq('id',1).select('horarios').single();
    if(error||!data)throw new Error('No pudimos guardar los horarios generales. Verifica tu acceso de administrador e intenta nuevamente.');
    return normalizarHorarios(data.horarios)||{};
  }
}
