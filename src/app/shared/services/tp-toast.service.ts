import {Injectable,signal} from '@angular/core';
import {TpToastData,ToastNotification} from '../models/toast';

@Injectable({providedIn:'root'})
export class TpToastService {
  readonly notifications=signal<ToastNotification[]>([]);
  private nextId=0;
  private timers=new Map<number,ReturnType<typeof setTimeout>>();
  show(data:TpToastData,duration=data.duration??3500):void {
    const id=++this.nextId;
    if(this.notifications().length>=3)this.dismiss(this.notifications()[0].id);
    this.notifications.update(items=>[...items,{...data,id,duration}]);
    if(duration>0)this.timers.set(id,setTimeout(()=>this.dismiss(id),duration));
  }
  success(message:string):void {this.show({title:'Listo',message,variant:'success'});}
  error(message:string):void {this.show({title:'No se pudo completar',message,variant:'error',duration:7000});}
  warning(message:string):void {this.show({title:'Atención',message,variant:'warning',duration:6000});}
  dismiss(id:number):void {clearTimeout(this.timers.get(id));this.timers.delete(id);this.notifications.update(items=>items.filter(item=>item.id!==id));}
}
