import {QuoteSettingsService} from '../services/quote-settings.service';
import {quoteAdminSegment} from '../models/quote-route';
import {DEFAULT_ROOM_LIMITS} from '../models/room';
import {PublicNavigation} from '../../../shared/components/public-navigation/public-navigation';
import {RoomType,validRoomConfiguration} from '../models/room-configuration';
import {ChangeTracker} from '../../../core/utils/change-snapshot';
import {protectUnsavedChanges} from '../../../core/guards/unsaved-changes.guard';
import {TpSelectSearchComponent,TpSelectSearchOption} from '../../../shared/components/tp-select-search/tp-select-search.component';
import {DateRangeFilterComponent} from '../../../shared/components/date-range-filter/date-range-filter.component';
import {DateRangeFilterValue} from '../../../shared/components/date-range-filter/date-range-filter.model';
import {Component,inject,signal,computed,OnInit} from '@angular/core';import {RouterLink,ActivatedRoute} from '@angular/router';import {FormsModule} from '@angular/forms';import {TravelDataService,TravelRecord} from '../../../data/facades/travel-data.service';import {QuoteWorkflowService} from '../services/quote-workflow.service';import {Room,nights,validRooms} from '../models/room';import {PageHeader} from '../../../shared/components/page-header/page-header';import {Field} from '../../../shared/components/field/field';import {Button} from '../../../shared/components/button/button';import {Icon} from '../../../shared/components/icon/icon';import {RoomPicker} from '../components/room-picker/room-picker';import {State} from '../../../shared/components/state/state';
 @Component({selector:'tp-quote-editor',imports:[PublicNavigation,TpSelectSearchComponent,DateRangeFilterComponent,RouterLink,FormsModule,PageHeader,Field,Button,Icon,State,RoomPicker],templateUrl:'./quote-editor.html',styleUrl:'./quote-editor.scss'})
 export class QuoteEditor implements OnInit {
  mobileMenuOpen = signal(false);
  savedQuoteSegment = signal('');
  private stayRange: DateRangeFilterValue = {start:null,end:null};
  get stayDates(): DateRangeFilterValue { return this.stayRange; }
  set stayDates(value: DateRangeFilterValue) { this.stayRange=value || {start:null,end:null};this.start=value?.start || '';this.end=value?.end || ''; }
  settings=inject(QuoteSettingsService);
  roomLimits=signal({...DEFAULT_ROOM_LIMITS});
  limitsReady=signal(false);
  configuredRoomsValid=computed(()=>this.limitsReady()&&validRooms(this.rooms(),this.roomLimits()));
 text(es:string,params:Record<string,string|number>={}){return this.data.language.formatText(es,params);}
 private changes=new ChangeTracker();
 private draft(){return {name:this.name,treatmentId:this.treatmentId,email:this.email,phone:this.phone,start:this.start,end:this.end,notes:this.notes,destinationId:this.destinationId,employeeId:this.employeeId,rooms:this.rooms(),hotels:this.selectedHotels().map(h=>h.id),regimes:this.hotelRegimes,prices:this.hotelPrices};}
 private pendingChanges=protectUnsavedChanges(()=>!this.success()&&this.changes.hasChanges(this.draft()),()=>this.busy());
 canDeactivate(){return this.pendingChanges.confirm();}
  data=inject(TravelDataService);workflow=inject(QuoteWorkflowService);route=inject(ActivatedRoute);publicRequest=!!this.route.snapshot.data['public'];preview=!!this.route.snapshot.data['preview'];multiple=this.route.snapshot.queryParamMap.get('tipo')==='comparativa';hotelId=Number(this.route.snapshot.paramMap.get('hotelId'));step=signal(0);busy=signal(false);loading=signal(true);loadingHotels=signal(false);error=signal('');success=signal(false);destinations=signal<TravelRecord[]>([]);hotels=signal<TravelRecord[]>([]);selectedHotels=signal<TravelRecord[]>([]);regimeOptions=signal<Record<string,TpSelectSearchOption[]>>({});regimeLoading=signal<Record<string,boolean>>({});regimeErrors=signal<Record<string,string>>({});employees=signal<any[]>([]);rooms=signal<Room[]>([{adults:2,children:0,childAges:[]}]);ages=Array.from({length:18},(_,i)=>i);today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City'}).format(new Date());name='';email='';phone='';start='';end='';notes='';destinationId:number|null=null;employeeId:number|null=null;hotelRegimes:Record<string,number|null>={};hotelPrices:Record<string,number|null>={};hotelPage=0;hotelTotal=0;roomValidity=computed(()=>validRooms(this.rooms()));nightCount(){return nights(this.start,this.end);}
 destinationOptions=computed<TpSelectSearchOption[]>(()=>this.destinations().map(destination=>({value:Number(destination.id),label:destination.title})));
  employeeOptions=computed<TpSelectSearchOption[]>(()=>this.employees().map(employee=>({value:employee.id,label:employee.nombre})));
  treatmentId:number|null=null;
  roomTypes=signal<RoomType[]>([]);
  roomConfigurationValidity=computed(()=>this.rooms().every(room=>validRoomConfiguration(room,this.roomTypes())));
  treatments=signal<Array<{id:number;nombre:string;abreviacion:string}>>([]);
  treatmentOptions=computed<TpSelectSearchOption[]>(()=>[
    {value:'',label:this.text('Sin prefijo')},
    ...this.treatments().map(treatment=>({value:treatment.id,label:`${treatment.abreviacion} — ${treatment.nombre}`})),
  ]);
 totalGuests=(n:number,r:Room)=>n+r.adults+r.children;
  async ngOnInit(){try{
   const limits=await this.settings.load();
   this.roomLimits.set(limits);
   this.rooms.update(rooms=>rooms.map(room=>({...room,adults:Math.min(room.adults,limits.maxPeoplePerRoom)})));
   this.limitsReady.set(true);
   await this.loadDestinations();this.employeeId=null;
  this.roomTypes.set(await this.data.catalogs.obtenerTiposHabitacionCamas(this.data.language.language()));
  this.treatments.set(await this.data.legacy.obtenerTratamientosActivos());
  const advisors=await this.data.employees.asesoresCotizacion();
  if(advisors.error)throw advisors.error;
  this.employees.set(advisors.data||[]);
  if(!this.employees().length)throw new Error('No hay asesores disponibles para esta solicitud.');
  const ownId=this.data.auth.identity()?.employeeId;
  if(!this.publicRequest&&this.employees().some(employee=>employee.id===ownId))this.employeeId=ownId||null;
 if(this.publicRequest&&this.hotelId){const hotel:any=await this.data.hotels.infoHotel(this.hotelId,'es');if(!hotel)throw new Error('No encontramos el hotel.');this.destinationId=hotel.catalogo_destino_id||hotel.catalogoDestino?.id||null;const record:TravelRecord={id:String(this.hotelId),title:hotel.nombre_hotel,subtitle:hotel.catalogoDestino?.nombre||'',image:hotel.fondo||'',status:'',raw:hotel};this.hotels.set([record]);this.selectedHotels.set([record]);this.hotelRegimes[record.id]=hotel.regimen_id||null;await this.loadHotelRegimes(record);}
  }catch(e){this.error.set(e instanceof Error?e.message:'No pudimos cargar las opciones.');}finally{this.changes.capture(this.draft());this.loading.set(false);}}
 async loadDestinations(){
  const first=await this.data.publicDestinations();
  const rows=[...first.items];
  for(let page=1;!this.publicRequest && rows.length<first.total;page++){
   const more=await this.data.publicDestinations('NACIONAL',page);
   if(!more.items.length)break;
   rows.push(...more.items);
  }
  this.destinations.set(rows);
 }
 async loadHotels(more=false){if(!this.destinationId)return;this.loadingHotels.set(true);this.error.set('');try{this.hotelPage=more?this.hotelPage+1:0;if(!more)this.selectedHotels.set([]);const r=await this.data.hotelPage(this.destinationId,this.hotelPage);this.hotels.update(old=>more?[...old,...r.items]:r.items);this.hotelTotal=r.total;}catch(e){this.error.set('No pudimos cargar los hoteles de ese destino.');}finally{this.loadingHotels.set(false);}}
 async toggleHotel(record:TravelRecord){const exists=this.selectedHotels().some(r=>r.id===record.id);this.selectedHotels.update(rows=>exists?rows.filter(r=>r.id!==record.id):this.multiple?[...rows,record]:[record]);if(!exists)await this.loadHotelRegimes(record);}
 async loadHotelRegimes(record:TravelRecord){
  if(this.regimeLoading()[record.id])return;
  this.regimeLoading.update(rows=>({...rows,[record.id]:true}));
  this.regimeErrors.update(rows=>({...rows,[record.id]:''}));
  try{
   const configured=await this.data.cached('quote-hotel-regimes:'+this.data.language.language()+':'+record.id,()=>this.data.hotels.obtenerRegimenesCotizacionHotel(Number(record.id),this.data.language.language()));
   this.regimeOptions.update(rows=>({...rows,[record.id]:configured.map(regime=>({value:regime.id,label:regime.descripcion}))}));
   if(!configured.some(regime=>regime.id===this.hotelRegimes[record.id])){
    this.hotelRegimes[record.id]=configured.find(regime=>regime.principal)?.id??(configured.length===1?configured[0].id:null);
   }
  }catch(e){
   this.regimeOptions.update(rows=>({...rows,[record.id]:[]}));
   this.hotelRegimes[record.id]=null;
   this.regimeErrors.update(rows=>({...rows,[record.id]:'No pudimos cargar los regímenes de este hotel.'}));
  }finally{this.regimeLoading.update(rows=>({...rows,[record.id]:false}));}
 }
 regimesReady(){return this.selectedHotels().every(hotel=>!this.regimeLoading()[hotel.id]&&!this.regimeErrors()[hotel.id]&&(!this.regimeOptions()[hotel.id]?.length||this.regimeOptions()[hotel.id].some(option=>option.value===this.hotelRegimes[hotel.id])));}
 selected(id:string){return this.selectedHotels().some(r=>r.id===id);}
 updateRoom(index:number,key:'adults'|'children',value:any){this.rooms.update(rooms=>rooms.map((r,i)=>i===index?{...r,[key]:Number(value),childAges:key==='children'?Array.from({length:Number(value)},(_,j)=>r.childAges[j]??null):r.childAges}:r));}
 updateAge(index:number,child:number,age:any){this.rooms.update(rooms=>rooms.map((r,i)=>i===index?{...r,childAges:r.childAges.map((a,j)=>j===child?(age===null?null:Number(age)):a)}:r));}
  next(){this.error.set('');if(this.step()===0&&!this.employees().some(employee=>employee.id===this.employeeId)){this.error.set('Selecciona un asesor para tu solicitud.');return;}if(this.step()===0&&(!this.name.trim()||!this.phone.trim()||!this.nightCount()||!this.roomValidity())){this.error.set('Completa el nombre, teléfono, fechas y las edades de los menores.');return;}if(this.step()===0&&!this.roomConfigurationValidity()){this.error.set('Selecciona un tipo de habitación válido y revisa las camas elegidas, si las indicaste.');return;}if(this.step()===1&&!this.regimesReady()){this.error.set('Revisa el régimen de alojamiento de cada hotel.');return;}if(this.step()===1&&!this.selectedHotels().length){this.error.set('Selecciona al menos un hotel.');return;}this.step.update(s=>Math.min(2,s+1));}
   async save(){
     if(this.preview||this.busy()||this.success()||!this.configuredRoomsValid())return;
    this.busy.set(true);
    this.error.set('');
    try{
      const destinationName=this.destinations().find(r=>Number(r.id)===this.destinationId)?.title||this.selectedHotels()[0]?.subtitle||'';
       const result=await this.workflow.create({name:this.name,treatmentId:this.treatmentId,email:this.email,phone:this.phone,start:this.start,end:this.end,destinationId:this.destinationId||0,destinationName,rooms:this.rooms(),notes:this.notes,multiple:this.multiple,employeeId:this.employeeId,language:this.data.language.language(),hotels:this.selectedHotels().map(h=>({id:Number(h.id),name:h.title,regimeId:this.hotelRegimes[h.id]??null,price:this.hotelPrices[h.id]??null}))},this.publicRequest);
       if(!this.publicRequest)this.savedQuoteSegment.set(this.multiple?result.public_id:quoteAdminSegment(result.id,result.public_id));
       this.changes.capture(this.draft());
       this.success.set(true);
     }catch(e){
       this.error.set(e instanceof Error?e.message:'No pudimos guardar la solicitud.');
     }finally{
       this.busy.set(false);
       this.pendingChanges.sync();
     }
  }
 removeRoom(i:number){if(this.rooms().length>1)this.rooms.update(r=>r.filter((_,index)=>i!==index));}addRoom(){if(this.limitsReady()&&this.rooms().length<this.roomLimits().maxRooms)this.rooms.update(r=>[...r,{adults:Math.min(2,this.roomLimits().maxPeoplePerRoom),children:0,childAges:[]}]);}
}
