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

@Component({
  selector:'tp-general-settings',
  imports:[FormsModule, PageHeader, Button, Field, State],
  templateUrl:'./general-settings.html',
  styleUrl:'./general-settings.scss',
})
export class GeneralSettings implements OnInit {
  private readonly settings=inject(QuoteSettingsService);
  private readonly auth=inject(AuthService);
  private readonly toast=inject(TpToastService);
  readonly loading=signal(true);
  readonly saving=signal(false);
  readonly error=signal('');
  readonly saved=signal<QuoteRoomLimits|null>(null);
  readonly maxRooms=signal<number|null>(null);
  readonly maxPeoplePerRoom=signal<number|null>(null);
  readonly valid=computed(()=>[this.maxRooms(),this.maxPeoplePerRoom()].every(value=>value!==null&&Number.isInteger(value)&&value>=1&&value<=2147483647));
  readonly dirty=computed(()=>!!this.saved()&&(this.maxRooms()!==this.saved()!.maxRooms||this.maxPeoplePerRoom()!==this.saved()!.maxPeoplePerRoom));
  private readonly pending=protectUnsavedChanges(()=>this.dirty(),()=>this.saving());
  canDeactivate(){return this.pending.confirm();}
  ngOnInit(){void this.load();}
  async load(){
    if(this.saving()||this.dirty())return;
    this.loading.set(true);this.error.set('');
    try{this.apply(await this.settings.load());}
    catch(error){this.error.set(error instanceof Error?error.message:'No pudimos cargar la configuración general.');}
    finally{this.loading.set(false);}
  }
  private apply(limits:QuoteRoomLimits){
    this.saved.set(limits);this.maxRooms.set(limits.maxRooms);this.maxPeoplePerRoom.set(limits.maxPeoplePerRoom);
  }
  reset(){if(!this.saving()&&this.saved()){this.apply(this.saved()!);this.error.set('');}}
  async save(){
    if(this.loading()||this.saving()||!this.saved()||!this.dirty()||!this.valid()||!this.auth.hasPermission('configuracion.manage'))return;
    this.saving.set(true);this.error.set('');this.pending.sync();
    try{
      this.apply(await this.settings.save({maxRooms:this.maxRooms()!,maxPeoplePerRoom:this.maxPeoplePerRoom()!}));
      this.toast.success('Configuración general guardada.');
    }catch(error){this.error.set(error instanceof Error?error.message:'No pudimos guardar la configuración general.');}
    finally{this.saving.set(false);this.pending.sync();}
  }
}
