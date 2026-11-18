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
import {QuoteCopyService, type CopySection, type QuoteCopySnapshot} from '../../quotations/services/quote-copy.service';
import {COPY_GROUPS, copyGroups, validCopyText, type CopyBlock} from '../../../../../supabase/functions/_shared/quote-copy';
import {HOME_COPY} from '../../../../../supabase/functions/_shared/home-copy';
import {DESTINATION_COPY} from '../../../../../supabase/functions/_shared/destination-copy';
import {HOTEL_COPY, hotelInheritsDestinationCopy} from '../../../../../supabase/functions/_shared/hotel-copy';
import {QuoteCopyPreview} from '../quote-copy-preview/quote-copy-preview';
import {PublicPage} from '../../public/explore/public';
import {InlineCopy} from '../inline-copy/inline-copy';

const TEXT_GROUPS = {cotizacion: COPY_GROUPS, inicio: copyGroups(HOME_COPY), destino: copyGroups(DESTINATION_COPY), hotel: copyGroups(HOTEL_COPY)};
const TEXT_SECTIONS = ['cotizacion', 'inicio', 'destino', 'hotel'] as const;
type TextDraft = {saved: QuoteCopySnapshot|null; textos: CopyBlock; error: string};
const emptyDraft = (): TextDraft => ({saved: null, textos: {}, error: ''});

@Component({
  selector:'tp-general-settings',
  imports:[FormsModule, RouterLink, PageHeader, Button, Field, State, QuoteCopyPreview, PublicPage, InlineCopy],
  templateUrl:'./general-settings.html',
  styleUrl:'./general-settings.scss',
})
export class GeneralSettings implements OnInit {
  private readonly settings=inject(QuoteSettingsService);
  private readonly auth=inject(AuthService);
  private readonly toast=inject(TpToastService);
  private readonly hotelSettings=inject(HotelSettingsService);
  private readonly quoteCopy=inject(QuoteCopyService);
  readonly tab=signal<'quotes'|'hotels'|'texts'>('quotes');
  readonly textScreen=signal<CopySection>('cotizacion');
  readonly textScreens=[
    {key:'cotizacion',label:'Cotizaciones',icon:'quote'},
    {key:'inicio',label:'Inicio',icon:'home'},
    {key:'destino',label:'Destinos',icon:'map'},
    {key:'hotel',label:'Hoteles',icon:'hotel'},
  ] as const;
  private readonly textDrafts=signal({cotizacion:emptyDraft(),inicio:emptyDraft(),destino:emptyDraft(),hotel:emptyDraft()});
  readonly textError=computed(()=>this.textDrafts()[this.textScreen()].error);
  readonly savedTexts=computed(()=>this.textDrafts()[this.textScreen()].saved);
  readonly texts=computed(()=>this.textDrafts()[this.textScreen()].textos);
  readonly textDirty=computed(()=>this.isTextDirty(this.textScreen()));
  readonly anyTextDirty=computed(()=>TEXT_SECTIONS.some(section=>this.isTextDirty(section)));
  readonly textValid=computed(()=>TEXT_GROUPS[this.textScreen()].every(group=>group.fields.every(field=>
    validCopyText(this.textValue(group.key,field.key,field.text)))));
  isTextDirty(section:CopySection){
    const {saved,textos}=this.textDrafts()[section];
    return !!saved&&TEXT_GROUPS[section].some(group=>group.fields.some(({key,text})=>{
      const fallback=this.textFallback(section,group.key,key,text);
      return (textos[group.key]?.[key]??fallback)!==(saved.textos[group.key]?.[key]??fallback);
    }));
  }
  private updateTextDraft(section:CopySection, patch:Partial<TextDraft>){
    this.textDrafts.update(drafts=>({...drafts,[section]:{...drafts[section],...patch}}));
  }
  private textFallback(section:CopySection,group:string,key:string,fallback:string){
    return section==='hotel' && hotelInheritsDestinationCopy(group,key)
      ? this.textDrafts().destino.saved?.textos[group]?.[key]??fallback : fallback;
  }
  textValue(group:string,key:string,fallback:string){
    return this.texts()[group]?.[key]??this.textFallback(this.textScreen(),group,key,fallback);
  }
  setText(group:string,key:string,value:string){
    const textos=this.texts();
    this.updateTextDraft(this.textScreen(),{textos:{...textos,[group]:{...textos[group],[key]:value}}});
  }
  private textOverrides():CopyBlock{
    const result:CopyBlock={};
    const section=this.textScreen();
    for(const group of TEXT_GROUPS[section]) for(const field of group.fields){
      const value=this.textValue(group.key,field.key,field.text).trim();
      const fallback=this.textFallback(section,group.key,field.key,field.text);
      // Keep a saved override even if Destinos later publishes the same text.
      const unchangedInheritedOverride=section==='hotel' && hotelInheritsDestinationCopy(group.key,field.key)
        && this.savedTexts()?.textos[group.key]?.[field.key]===value;
      if(value!==fallback||unchangedInheritedOverride)(result[group.key]??={})[field.key]=value;
    }
    return result;
  }
  private applyTexts(section:CopySection,snapshot:QuoteCopySnapshot){
    this.updateTextDraft(section,{saved:snapshot,textos:snapshot.textos,error:''});
  }
  readonly timeFields=HOTEL_TIME_FIELDS;
  readonly hotelError=signal('');
  readonly savedHours=signal<HotelHorarios|null>(null);
  readonly hours=signal<HotelHorarios>({});
  readonly hotelDirty=computed(()=>this.savedHours()!==null&&this.timeFields.some(field=>(this.hours()[field.key]||'')!==(this.savedHours()![field.key]||'')));
  readonly hotelValid=computed(()=>Object.values(this.hours()).every(value=>!value||/^([01]\d|2[0-3]):[0-5]\d$/.test(value)));
  readonly activeDirty=computed(()=>this.tab()==='texts'?this.textDirty():this.tab()==='hotels'?this.hotelDirty():this.quoteDirty());
  readonly activeValid=computed(()=>this.tab()==='texts'?this.textValid():this.tab()==='hotels'?this.hotelValid():this.valid());
  readonly activeError=computed(()=>this.tab()==='texts'?this.textError():this.tab()==='hotels'?this.hotelError():this.error());
  readonly activeReady=computed(()=>this.tab()==='texts'?!!this.savedTexts():this.tab()==='hotels'?!!this.savedHours():!!this.saved());
  readonly loading=signal(true);
  readonly saving=signal(false);
  readonly error=signal('');
  readonly saved=signal<QuoteRoomLimits|null>(null);
  readonly maxRooms=signal<number|null>(null);
  readonly maxPeoplePerRoom=signal<number|null>(null);
  readonly valid=computed(()=>[this.maxRooms(),this.maxPeoplePerRoom()].every(value=>value!==null&&Number.isInteger(value)&&value>=1&&value<=2147483647));
  readonly quoteDirty=computed(()=>!!this.saved()&&(this.maxRooms()!==this.saved()!.maxRooms||this.maxPeoplePerRoom()!==this.saved()!.maxPeoplePerRoom));
  readonly dirty=computed(()=>this.quoteDirty()||this.hotelDirty()||this.anyTextDirty());
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
      ...TEXT_SECTIONS.filter(section=>!this.isTextDirty(section)).map(async section=>{
        this.updateTextDraft(section,{error:''});
        try{this.applyTexts(section,await this.quoteCopy.loadOriginal(section));}
        catch(error){this.updateTextDraft(section,{error:error instanceof Error?error.message:'No pudimos cargar los textos.'});}
      }),
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
    if(this.tab()==='texts'&&this.savedTexts())this.applyTexts(this.textScreen(),this.savedTexts()!);
    else if(this.tab()==='hotels'&&this.savedHours()){this.applyHours(this.savedHours()!);this.hotelError.set('');}
    else if(this.tab()==='quotes'&&this.saved()){this.apply(this.saved()!);this.error.set('');}
  }
  async save(){
    if(this.loading()||this.saving()||!this.activeDirty()||!this.activeValid()||!this.auth.hasPermission('configuracion.manage'))return;
    this.saving.set(true);this.error.set('');this.pending.sync();
    const section=this.textScreen();
    try{
      if(this.tab()==='texts'){
        this.updateTextDraft(section,{error:''});
        this.applyTexts(section,await this.quoteCopy.save({version:this.savedTexts()!.version,textos:this.textOverrides()},section));
        this.toast.success(`Textos de ${this.textScreens.find(screen=>screen.key===section)?.label} guardados.`);
        return;
      }else if(this.tab()==='hotels'){
        this.hotelError.set('');
        this.applyHours(await this.hotelSettings.save(this.hours()));
      }else{
        this.apply(await this.settings.save({maxRooms:this.maxRooms()!,maxPeoplePerRoom:this.maxPeoplePerRoom()!}));
      }
      this.toast.success('Configuración de '+(this.tab()==='hotels'?'hoteles':'cotizaciones')+' guardada.');
    }catch(error){
      const message=error instanceof Error?error.message:'No pudimos guardar la configuración general.';
      if(this.tab()==='texts')this.updateTextDraft(section,{error:message});
      else (this.tab()==='hotels'?this.hotelError:this.error).set(message);
    }
    finally{this.saving.set(false);this.pending.sync();}
  }
}
