import {parseQuoteRoute,quoteAdminSegment} from '../models/quote-route';
import {DestroyRef} from '@angular/core';
import {NavigationEnd} from '@angular/router';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {BannerComponent} from '../../../shared/components/banner/banner.component';
import {QuoteTariffEditor} from './quote-tariff-editor';
import {QuoteTariffList} from './quote-tariff-list';
import {QUOTE_TARIFFS,QuoteData,quoteTariffRooms,quoteTariffPayload,quoteTariffValidation} from '../models/quote-tariffs';
import {TpSelectSearchComponent} from '../../../shared/components/tp-select-search/tp-select-search.component';
import {QUOTE_STATUS_OPTIONS} from '../models/quote-status';
import {ImagenesCarruselComponent} from '../../../shared/components/imagenes-carrusel/imagenes-carrusel.component';
import type {EmpleadoFirma} from '../../../data/queries/cotizaciones.service';
import {quotePrices,quotePhotos,quoteRoomText,quoteDate} from '../models/quote-presentation';
import {DateRangeFilterComponent} from '../../../shared/components/date-range-filter/date-range-filter.component';
import {TpToastService} from '../../../shared/services/tp-toast.service';
import {Component,inject,signal,computed,OnInit} from '@angular/core';import {ActivatedRoute,Router,RouterLink} from '@angular/router';import {FormsModule} from '@angular/forms';import {DatePipe} from '@angular/common';import {TravelDataService} from '../../../data/facades/travel-data.service';import {Button} from '../../../shared/components/button/button';import {Icon} from '../../../shared/components/icon/icon';import {Badge} from '../../../shared/components/badge/badge';import {Field} from '../../../shared/components/field/field';import {State} from '../../../shared/components/state/state';import {Dialog} from '../../../shared/components/dialog/dialog';import {PageHeader} from '../../../shared/components/page-header/page-header';
@Component({selector:'tp-quote-detail',imports:[QuoteTariffEditor,QuoteTariffList,TpSelectSearchComponent,BannerComponent,ImagenesCarruselComponent,DateRangeFilterComponent,FormsModule,RouterLink,DatePipe,Button,Icon,Badge,Field,State,Dialog,PageHeader],templateUrl:'./quote-detail.html',styleUrl:'./quote-detail.scss'})
export class QuoteDetail implements OnInit {toast=inject(TpToastService);
 data=inject(TravelDataService);route=inject(ActivatedRoute);router=inject(Router);publicView=!!this.route.snapshot.data['public'];preview=!!this.route.snapshot.data['preview'];multiple=this.route.snapshot.data['multiple']||this.route.snapshot.queryParamMap.get('tipo')==='comparativa';
 private routeSegment=this.route.snapshot.paramMap.get('id')||'';
 private quoteRoute=!this.multiple?parseQuoteRoute(this.routeSegment):{internalId:null,publicId:this.routeSegment};
 id=this.quoteRoute.publicId;internalId=this.quoteRoute.internalId;
 private destroyRef=inject(DestroyRef);
 loading=signal(true);error=signal('');record=signal<any>(null);hotels=signal<any[]>([]);editOpen=signal(false);deleteOpen=signal(false);emailOpen=signal(false);busy=signal(false);form:any={};emailTo='';emailMessage='';
 adviser=signal<EmpleadoFirma|null>(null);
 readonly statusOptions=QUOTE_STATUS_OPTIONS;
 readonly tariffRooms=signal<QuoteData[]>([]);
 readonly roomTypes=signal<QuoteData[]>([]);
 readonly origins=signal<QuoteData[]>([]);
 readonly catalogTariffs=signal<QuoteData[]>([]);
 readonly policyCatalog=signal<any[]>([]);
 readonly policyLoading=signal(false);
 readonly policyError=signal('');
 readonly tariffOptions=[{value:'no_reembolsable',label:'No reembolsable'},{value:'apartado',label:'Apartado'}];
 async loadPolicyCatalog(){
  if(this.policyLoading())return;
  this.policyLoading.set(true);this.policyError.set('');
  try{
   const hotelId=this.record()?.hotel_id||await this.data.quotes.obtenerHotelIdPorCotizacionPublica(this.id);
   const [policies,tariffs,origins,types]=await Promise.all([
    this.data.catalogs.obtenerPoliticasDisponiblesTarifa(),this.data.catalogs.obtenerCatalogoAdmin('tarifas'),
    this.data.catalogs.obtenerCatalogoAdmin('origen_reservacion'),hotelId?this.data.quotes.tiposHabitacionPorHotel(hotelId):Promise.resolve([])
   ]);
   this.policyCatalog.set(policies);this.catalogTariffs.set(tariffs.filter((tariff:any)=>tariff.activo));
    this.origins.update(current=>[...current.filter(item=>!origins.some((origin:any)=>Number(origin.id)===Number(item.id))),...origins]);
    this.roomTypes.update(current=>[...current.filter(item=>!types.some((type:any)=>Number(type.id)===Number(item.id))),...types]);
  }
  catch(error){this.policyError.set(error instanceof Error?error.message:'No pudimos cargar los catálogos de tarifas, políticas y habitaciones.');}
  finally{this.policyLoading.set(false);}
 }
 openPriceEditor(){
  const q=this.record();if(!q||!this.canEdit())return;
  const rooms=quoteTariffRooms(q);this.tariffRooms.set(rooms);
  this.form={...this.form,
   estatus:q.estatus_clave||'pendiente',
   fechaLimiteSeguro:q.fecha_limite_seguro||rooms[0]?.source?.fecha_limite_seguro||null,
   fechaLimiteMeses:q.fecha_limite_meses||rooms[0]?.source?.fecha_limite_meses||null,
   tipoTarifa:rooms[0]?.tipoTarifa||'no_reembolsable'
  };
  this.editOpen.set(true);void this.loadPolicyCatalog();
 }
 availablePolicies(key:string):any[]{
  const tariffs=this.record()?.politicas_tarifas;
  const group=key==='condicionesPrecioSinSeguro'?'noReembolsable':key==='condicionesPrecioConSeguro'?'apartado':this.form.tipoTarifa==='apartado'?'apartadoMeses':'noReembolsableMeses';
  if(Array.isArray(tariffs?.[group]))return tariffs[group];
  const type=group.startsWith('apartado')?'apartado':'no_reembolsable';
  const catalog=this.catalogTariffs().find(tariff=>tariff.clave===type);
  return catalog?catalog.politicas.filter((policy:any)=>policy.activo):this.policyCatalog();
 }
 tariffPolicyOptions():Record<string,QuoteData[]>{
  return {condicionesPrecioSinSeguro:this.availablePolicies('condicionesPrecioSinSeguro'),condicionesPrecioConSeguro:this.availablePolicies('condicionesPrecioConSeguro'),condicionesPrecioMeses:this.availablePolicies('condicionesPrecioMeses')};
 }
 changePolicyTariff(value:string){if(this.form.tipoTarifa===value)return;this.form.tipoTarifa=value;for(const room of this.tariffRooms()){room.tipoTarifa=value;room.condicionesPrecioMeses=[];}}
 tariffValidation(){return quoteTariffValidation(this.tariffRooms());}
 policyPayload(){return quoteTariffPayload(this.tariffRooms(),this.form);}
 presentedHotels=computed(()=>this.hotels().map(h=>({...h,title:h.hotel_nombre||h.nombre_hotel||'Alojamiento por confirmar',photos:quotePhotos(h),pricing:quotePrices(h),roomText:quoteRoomText(h)||quoteRoomText(this.record()||{})})));
 contactAdviser=computed<EmpleadoFirma>(()=>({nombre:this.adviser()?.nombre||this.record()?.empleado_nombre||'Equipo Trotapie',cargo:this.adviser()?.cargo||'Tu asesor de viajes',email:this.adviser()?.email||'atencionalcliente@trotapie.com',telefono:this.adviser()?.telefono||'+52 618 803 2003'}));
 dateText=quoteDate;
 folio(){const id=Number(this.record()?.id);return Number.isFinite(id)&&id>0?'CTRO-'+Math.trunc(id):'';}
 contactHref(){const phone=this.contactAdviser().telefono?.replace(/\D/g,'');return phone?'https://wa.me/'+phone+'?text='+encodeURIComponent('Hola, quisiera consultar mi cotización '+this.folio()):'mailto:'+this.contactAdviser().email;}
 photoError(event:Event){const image=event.target as HTMLImageElement;if(image.src.endsWith('/brand/iso.png'))return;image.src='/brand/iso.png';image.classList.add('photo-unavailable');}
 ngOnInit(){
  this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event=>{
   if(!(event instanceof NavigationEnd))return;
   const segment=this.route.snapshot.paramMap.get('id')||'';
   const multiple=!!this.route.snapshot.data['multiple']||this.route.snapshot.queryParamMap.get('tipo')==='comparativa';
   if(segment===this.routeSegment&&multiple===!!this.multiple)return;
   this.routeSegment=segment;this.multiple=multiple;
   const parsed=!multiple?parseQuoteRoute(segment):{internalId:null,publicId:segment};
   this.id=parsed.publicId;this.internalId=parsed.internalId;
   this.record.set(null);this.hotels.set([]);this.roomTypes.set([]);this.origins.set([]);
   void this.loadWithCatalog();
  });
  void this.loadWithCatalog();
 }
  private async loadWithCatalog(){await this.load();if(this.record())await this.loadTariffNames();}
  private async loadTariffNames(){
    const record=this.record();
    const rooms=this.hotels().flatMap(hotel=>quoteTariffRooms(hotel));
    const validIds=(values:any[])=>[...new Set(values.map(Number).filter(id=>Number.isSafeInteger(id)&&id>0))];
    const typeIds=validIds(rooms.flatMap(room=>QUOTE_TARIFFS.map(tariff=>room[tariff.roomKey]?.id)));
    const originIds=validIds(rooms.flatMap(room=>QUOTE_TARIFFS.map(tariff=>room[tariff.originKey])));
    // Labels load independently of the private editor's policy catalogs, including on public links.
    await Promise.allSettled([
      this.data.quotes.obtenerTiposHabitacionPorIds(typeIds).then(types=>{if(this.record()===record)this.roomTypes.set(types);}),
      this.data.quotes.obtenerOrigenesReservacionPorIds(originIds).then(origins=>{if(this.record()===record)this.origins.set(origins);})
    ]);
  }
 async load(){
  if(this.preview){this.loading.set(false);this.error.set('Inicia sesión para consultar el detalle de una cotización.');return;}
  this.loading.set(true);this.error.set('');
  try{
   const quotePromise=this.multiple
    ?(this.publicView?this.data.legacy.obtenerComparativaPublica(this.id):this.data.legacy.obtenerDetalleCotizacionMultiple(this.id))
    :(this.publicView?this.data.quotes.obtenerCotizacionPorPublicIdCliente(this.id,this.internalId):this.internalId?this.data.quotes.obtenerCotizacionPorId(this.internalId):this.data.quotes.obtenerCotizacionPorPublicId(this.id));
   const adviserPromise=this.publicView?this.data.quotes.obtenerEmpleadoFirmaPorCotizacion(this.id).catch(()=>null):Promise.resolve(null);
   const [q,adviser]=await Promise.all([quotePromise,adviserPromise]);
   if(!q)throw new Error('No encontramos esta propuesta.');
   this.record.set(q);this.hotels.set(this.multiple?q.cotizacion||[]:[q]);this.adviser.set(adviser);
   this.emailTo=q.cliente_email||q.correo||q.email||'';
   this.form={estatus:q.estatus_clave||'pendiente',fechaLimiteSeguro:q.fecha_limite_seguro||null,fechaLimiteMeses:q.fecha_limite_meses||null};
   if(!this.multiple){
    this.id=q.public_id||this.id;this.internalId=Number(q.id);
    const segment=quoteAdminSegment(this.internalId,this.id);
    this.routeSegment=segment;
    if(segment!==this.route.snapshot.paramMap.get('id'))await this.router.navigate(['../',segment],{relativeTo:this.route,queryParamsHandling:'preserve',replaceUrl:true});
   }
  }catch(e){this.error.set(e instanceof Error?e.message:'No pudimos consultar la cotización.');}
  finally{this.loading.set(false);}
 }
 price(h:any){const n=Number(h.precio??h.precio_cotizacion);return Number.isFinite(n)&&n>0?n:null;}
 image(h:any){return h.hotel_fondo||h.fondo||h.imagen_hotel||h.hotel?.fondo||'';}
 shareSegment(){return this.multiple?this.id:quoteAdminSegment(this.record()?.id||this.internalId,this.id);}
 shareUrl(){return location.origin+(this.multiple?'/comparativa/':'/cotizacion/')+this.shareSegment();}
 async copy(){try{await navigator.clipboard.writeText(this.shareUrl());this.toast.success('Enlace copiado.');}catch{this.toast.warning('No pudimos copiar el enlace. '+this.shareUrl());}}
 print(){window.print();}
 canEdit(){return !this.publicView&&this.data.auth.hasPermission('cotizaciones.edit');}
  async save(){if(!this.canEdit()||this.busy())return;const validation=this.tariffValidation();if(validation){this.toast.error(validation);return;}this.busy.set(true);this.error.set('');try{await this.data.quotes.actualizarCotizacionPublicaCompleta(this.id,this.policyPayload());this.data.invalidate();this.editOpen.set(false);this.toast.success('Cotización actualizada.');await this.load();}catch(e){this.toast.error(e instanceof Error?e.message:'No se pudo guardar.');}finally{this.busy.set(false);}}
 async delete(){if(!this.canEdit()||this.busy())return;this.busy.set(true);try{if(this.multiple)await this.data.legacy.eliminarCotizacionMultiple(this.record().id,this.hotels().map(h=>h.solicitud_id||h.id));else await this.data.quotes.eliminarSolicitudCotizacion(this.record().id);this.data.invalidate();this.deleteOpen.set(false);await this.router.navigate(['/admin/cotizaciones']);}catch(e){this.toast.error(e instanceof Error?e.message:'No se pudo eliminar.');}finally{this.busy.set(false);}}
 async restore(){if(!this.canEdit())return;this.busy.set(true);try{if(this.multiple)await this.data.legacy.restaurarCotizacionMultiple(this.record().id);else await this.data.quotes.marcarSolicitudComoPendiente(this.record().id);this.data.invalidate();this.toast.success('La propuesta está pendiente de nuevo.');await this.load();}catch(e){this.toast.error(e instanceof Error?e.message:'No se pudo restaurar.');}finally{this.busy.set(false);}}
 async sendEmail(){if(this.publicView||!this.data.auth.hasPermission('cotizaciones.edit')||this.busy())return;this.busy.set(true);try{await this.data.legacy.enviarCorreoCotizacion({to_email:this.emailTo,to_name:this.record().cliente_nombre||this.record().nombre_persona,hotel_nombre:this.hotels()[0]?.hotel_nombre,asunto:'Tu propuesta de viaje con Trotapie',mensaje:[this.emailMessage.trim(),this.shareUrl()].filter(Boolean).join('\n\n'),public_id:this.shareSegment(),tipo:this.multiple?'comparativa':'cotizacion',fecha_entrada:this.record().fecha_entrada,fecha_salida:this.record().fecha_salida,noches:this.record().noches});this.emailOpen.set(false);this.toast.success('Correo enviado correctamente.');}catch(e){this.toast.error(e instanceof Error?e.message:'No pudimos enviar el correo.');}finally{this.busy.set(false);}}
 openAlternative(h:any){const id=h.public_id||h.solicitud_public_id;if(id)void this.router.navigate(['/admin/cotizaciones',quoteAdminSegment(h.solicitud_id||h.id,id)],{queryParams:{tipo:'individual'}});}
}
