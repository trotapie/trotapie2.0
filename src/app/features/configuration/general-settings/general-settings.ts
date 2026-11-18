import {Component, OnInit, computed, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {AuthService} from '../../../core/services/auth.service';
import {protectUnsavedChanges} from '../../../core/guards/unsaved-changes.guard';
import {QuoteSettingsService} from '../../quotations/services/quote-settings.service';
import {QuoteRoomLimits} from '../../quotations/models/room';
import {PageHeader} from '../../../shared/components/page-header/page-header';
import {Button} from '../../../shared/components/button/button';
import {Field} from '../../../shared/components/field/field';
import {State} from '../../../shared/components/state/state';
import {TpToastService} from '../../../shared/services/tp-toast.service';
import {RouterLink} from '@angular/router';
import {HotelSettingsService} from '../services/hotel-settings.service';
import {HotelHorarios} from '../../../data/models/hotel-estancia.interface';
import {HOTEL_TIME_FIELDS} from '../../hotels/models/hotel-editor-model';

@Component({
  selector:'tp-general-settings',
  imports:[FormsModule, RouterLink, PageHeader, Button, Field, State],
  templateUrl:'./general-settings.html',
  styleUrl:'./general-settings.scss',
})
export class GeneralSettings implements OnInit {
  private readonly settings=inject(QuoteSettingsService);
  private readonly auth=inject(AuthService);
  private readonly toast=inject(TpToastService);
  private readonly hotelSettings=inject(HotelSettingsService);
  readonly tab=signal<'quotes'|'hotels'>('quotes');
  readonly timeFields=HOTEL_TIME_FIELDS;
  readonly hotelError=signal('');
  readonly savedHours=signal<HotelHorarios|null>(null);
  readonly hours=signal<HotelHorarios>({});
  readonly hotelDirty=computed(()=>this.savedHours()!==null&&this.timeFields.some(field=>(this.hours()[field.key]||'')!==(this.savedHours()![field.key]||'')));
  readonly hotelValid=computed(()=>Object.values(this.hours()).every(value=>!value||/^([01]\d|2[0-3]):[0-5]\d$/.test(value)));
  readonly activeDirty=computed(()=>this.tab()==='hotels'?this.hotelDirty():this.quoteDirty());
  readonly activeValid=computed(()=>this.tab()==='hotels'?this.hotelValid():this.valid());
  readonly loading=signal(true);
  readonly saving=signal(false);
  readonly error=signal('');
  readonly saved=signal<QuoteRoomLimits|null>(null);
  readonly maxRooms=signal<number|null>(null);
  readonly maxPeoplePerRoom=signal<number|null>(null);
  readonly valid=computed(()=>[this.maxRooms(),this.maxPeoplePerRoom()].every(value=>value!==null&&Number.isInteger(value)&&value>=1&&value<=2147483647));
  readonly quoteDirty=computed(()=>!!this.saved()&&(this.maxRooms()!==this.saved()!.maxRooms||this.maxPeoplePerRoom()!==this.saved()!.maxPeoplePerRoom));
  readonly dirty=computed(()=>this.quoteDirty()||this.hotelDirty());
  private readonly pending=protectUnsavedChanges(()=>this.dirty(),()=>this.saving());
  canDeactivate(){return this.pending.confirm();}
  ngOnInit(){void this.load();}
  async load(){
    if(this.saving())return;
    this.loading.set(true);this.error.set('');
    this.hotelError.set('');
    await Promise.all([
      this.quoteDirty()?Promise.resolve():this.settings.load().then(limits=>this.apply(limits)).catch(error=>this.error.set(error instanceof Error?error.message:'No pudimos cargar la configuración general.')),
      this.hotelDirty()?Promise.resolve():this.hotelSettings.load().then(hours=>this.applyHours(hours)).catch(error=>this.hotelError.set(error instanceof Error?error.message:'No pudimos cargar los horarios generales.')),
    ]);
    this.loading.set(false);
  }
  private apply(limits:QuoteRoomLimits){
    this.saved.set(limits);this.maxRooms.set(limits.maxRooms);this.maxPeoplePerRoom.set(limits.maxPeoplePerRoom);
  }
  private applyHours(hours:HotelHorarios){this.savedHours.set({...hours});this.hours.set({...hours});}
  setHour(key:keyof HotelHorarios,value:string){this.hours.set({...this.hours(),[key]:value});}
  reset(){
    if(this.saving())return;
    if(this.tab()==='hotels'&&this.savedHours()){this.applyHours(this.savedHours()!);this.hotelError.set('');}
    else if(this.tab()==='quotes'&&this.saved()){this.apply(this.saved()!);this.error.set('');}
  }
  async save(){
    if(this.loading()||this.saving()||!this.activeDirty()||!this.activeValid()||!this.auth.hasPermission('configuracion.manage'))return;
    this.saving.set(true);this.error.set('');this.pending.sync();
    try{
      if(this.tab()==='hotels'){
        this.hotelError.set('');
        this.applyHours(await this.hotelSettings.save(this.hours()));
      }else{
        this.apply(await this.settings.save({maxRooms:this.maxRooms()!,maxPeoplePerRoom:this.maxPeoplePerRoom()!}));
      }
      this.toast.success('Configuración de '+(this.tab()==='hotels'?'hoteles':'cotizaciones')+' guardada.');
    }catch(error){(this.tab()==='hotels'?this.hotelError:this.error).set(error instanceof Error?error.message:'No pudimos guardar la configuración general.');}
    finally{this.saving.set(false);this.pending.sync();}
  }
}
