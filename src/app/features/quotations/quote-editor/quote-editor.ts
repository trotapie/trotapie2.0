import {quoteAdminSegment} from '../models/quote-route';
import {quoteWhatsAppUrl} from '../models/quote-whatsapp';
import {construirNombreClienteVisible} from '../../../data/utils/cliente-nombre.util';
import {ChangeTracker} from '../../../core/utils/change-snapshot';
import {protectUnsavedChanges} from '../../../core/guards/unsaved-changes.guard';
import {TpSelectSearchComponent,TpSelectSearchOption} from '../../../shared/components/tp-select-search/tp-select-search.component';
import {DateRangeFilterComponent} from '../../../shared/components/date-range-filter/date-range-filter.component';
import {TpToastService} from '../../../shared/services/tp-toast.service';
import {Component,inject,signal,computed,OnInit} from '@angular/core';import {Router,RouterLink,ActivatedRoute} from '@angular/router';import {FormsModule} from '@angular/forms';import {TravelDataService,TravelRecord} from '../../../data/facades/travel-data.service';import {QuoteWorkflowService} from '../services/quote-workflow.service';import {Room,nights,validRooms} from '../models/room';import {PageHeader} from '../../../shared/components/page-header/page-header';import {Field} from '../../../shared/components/field/field';import {Button} from '../../../shared/components/button/button';import {Icon} from '../../../shared/components/icon/icon';import {RoomPicker} from '../components/room-picker/room-picker';import {State} from '../../../shared/components/state/state';
@Component({selector:'tp-quote-editor',imports:[TpSelectSearchComponent,DateRangeFilterComponent,RouterLink,FormsModule,PageHeader,Field,Button,Icon,State,RoomPicker],templateUrl:'./quote-editor.html',styleUrl:'./quote-editor.scss'})
export class QuoteEditor implements OnInit {toast=inject(TpToastService);
 private changes=new ChangeTracker();
 private draft(){return {name:this.name,treatmentId:this.treatmentId,email:this.email,phone:this.phone,start:this.start,end:this.end,notes:this.notes,destinationId:this.destinationId,employeeId:this.employeeId,rooms:this.rooms(),hotels:this.selectedHotels().map(h=>h.id),regimes:this.hotelRegimes,prices:this.hotelPrices};}
 private pendingChanges=protectUnsavedChanges(()=>!this.success()&&this.changes.hasChanges(this.draft()),()=>this.busy());
 canDeactivate(){return this.pendingChanges.confirm();}
 data=inject(TravelDataService);workflow=inject(QuoteWorkflowService);route=inject(ActivatedRoute);router=inject(Router);publicRequest=!!this.route.snapshot.data['public'];preview=!!this.route.snapshot.data['preview'];multiple=this.route.snapshot.queryParamMap.get('tipo')==='comparativa';hotelId=Number(this.route.snapshot.paramMap.get('hotelId'));step=signal(0);busy=signal(false);loading=signal(true);loadingHotels=signal(false);error=signal('');success=signal('');destinations=signal<TravelRecord[]>([]);hotels=signal<TravelRecord[]>([]);selectedHotels=signal<TravelRecord[]>([]);regimeOptions=signal<Record<string,TpSelectSearchOption[]>>({});regimeLoading=signal<Record<string,boolean>>({});regimeErrors=signal<Record<string,string>>({});employees=signal<any[]>([]);rooms=signal<Room[]>([{adults:2,children:0,childAges:[]}]);ages=Array.from({length:18},(_,i)=>i);today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City'}).format(new Date());name='';email='';phone='';start='';end='';notes='';destinationId:number|null=null;employeeId:number|null=null;hotelRegimes:Record<string,number|null>={};hotelPrices:Record<string,number|null>={};hotelPage=0;hotelTotal=0;roomValidity=computed(()=>validRooms(this.rooms()));nightCount(){return nights(this.start,this.end);}
 destinationOptions=computed<TpSelectSearchOption[]>(()=>this.destinations().map(destination=>({value:Number(destination.id),label:destination.title})));
  employeeOptions=computed<TpSelectSearchOption[]>(()=>this.employees().map(employee=>({value:employee.id,label:employee.nombre})));
  treatmentId:number|null=null;
  treatments=signal<Array<{id:number;nombre:string;abreviacion:string}>>([]);
  treatmentOptions=computed<TpSelectSearchOption[]>(()=>[
    {value:'',label:'Sin prefijo'},
    ...this.treatments().map(treatment=>({value:treatment.id,label:`${treatment.abreviacion} — ${treatment.nombre}`})),
  ]);
  clientDisplayName(){return construirNombreClienteVisible({nombreCompleto:this.name,tratamientoAbreviacion:this.treatments().find(treatment=>treatment.id===this.treatmentId)?.abreviacion});}
  advisorName(){return this.employees().find(employee=>employee.id===this.employeeId)?.nombre||'Equipo Trotapie';}
 totalGuests=(n:number,r:Room)=>n+r.adults+r.children;
 async ngOnInit(){try{await this.loadDestinations();this.employeeId=this.publicRequest?null:this.data.auth.identity()?.employeeId||null;
  this.treatments.set(await this.data.legacy.obtenerTratamientosActivos());
  if(this.publicRequest){
    const r=await this.data.backend.client.from('empleados').select('id,nombre').or('estatus_id.is.null,estatus_id.eq.1').order('id');
    if(r.error)throw r.error;
    this.employees.set(r.data||[]);
    if(!this.employees().length)throw new Error('No hay asesores disponibles para esta solicitud.');
  }else if(this.data.auth.identity()?.role==='admin'){const r=await this.data.employees.empleados();if(r.error)throw r.error;this.employees.set(r.data||[]);}
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
   const configured=await this.data.cached('quote-hotel-regimes:'+record.id,()=>this.data.hotels.obtenerRegimenesCotizacionHotel(Number(record.id),this.data.language.language()));
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
 next(){this.error.set('');if(this.step()===0&&this.publicRequest&&!this.employees().some(employee=>employee.id===this.employeeId)){this.error.set('Selecciona un asesor para tu solicitud.');return;}if(this.step()===0&&(!this.name.trim()||!this.phone.trim()||!this.nightCount()||!this.roomValidity())){this.error.set('Completa el nombre, teléfono, fechas y las edades de los menores.');return;}if(this.step()===1&&!this.regimesReady()){this.error.set('Revisa el régimen de alojamiento de cada hotel.');return;}if(this.step()===1&&!this.selectedHotels().length){this.error.set('Selecciona al menos un hotel.');return;}this.step.update(s=>Math.min(2,s+1));}
  whatsappUrl = signal('');
  async save(){
    if(this.busy()||this.success())return;
    this.busy.set(true);
    this.error.set('');
    try{
      const destinationName=this.destinations().find(r=>Number(r.id)===this.destinationId)?.title||this.selectedHotels()[0]?.subtitle||'';
      if(this.publicRequest&&!this.whatsappUrl()){
        const url=quoteWhatsAppUrl({
          name:this.clientDisplayName(),phone:this.phone,email:this.email,destination:destinationName,
          start:this.start,end:this.end,nights:this.nightCount(),rooms:this.rooms(),notes:this.notes,
          advisor:this.advisorName(),
          hotels:this.selectedHotels().map(hotel=>({
            name:hotel.title,
            regime:String(this.regimeOptions()[hotel.id]?.find(option=>option.value===this.hotelRegimes[hotel.id])?.label||'Por confirmar'),
          })),
        });
        this.whatsappUrl.set(url);
        // Keep this page alive to save, and open WhatsApp while the click is still active.
        // The explicit link remains available if the browser blocks the new tab.
        try{window.open(url,'_blank','noopener,noreferrer');}catch{}
      }
      const result=await this.workflow.create({name:this.name,treatmentId:this.treatmentId,email:this.email,phone:this.phone,start:this.start,end:this.end,destinationId:this.destinationId||0,destinationName,rooms:this.rooms(),notes:this.notes,multiple:this.multiple,employeeId:this.employeeId,language:this.data.language.language(),hotels:this.selectedHotels().map(h=>({id:Number(h.id),name:h.title,regimeId:this.hotelRegimes[h.id]??null,price:this.hotelPrices[h.id]??null}))},this.publicRequest);
      this.changes.capture(this.draft());
      this.busy.set(false);
      if(this.publicRequest){
        this.success.set('Tu solicitud quedó guardada. Envía el mensaje en WhatsApp para continuar con tu asesor.');
        this.pendingChanges.sync();
      }else{
        this.pendingChanges.sync();
        this.toast.success('Cotización creada correctamente.');
        await this.router.navigate(['/admin/cotizaciones',this.multiple?result.public_id:quoteAdminSegment(result.id,result.public_id)],{queryParams:{tipo:this.multiple?'comparativa':'individual'}});
      }
    }catch(e){
      if(this.publicRequest)this.error.set(e instanceof Error?e.message:'No pudimos guardar la solicitud.');
      else this.toast.error(e instanceof Error?e.message:'No pudimos guardar la solicitud.');
    }finally{this.busy.set(false);}
  }
 removeRoom(i:number){if(this.rooms().length>1)this.rooms.update(r=>r.filter((_,index)=>i!==index));}addRoom(){if(this.rooms().length<8)this.rooms.update(r=>[...r,{adults:2,children:0,childAges:[]}]);}
}
