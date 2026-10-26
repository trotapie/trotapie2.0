import {quoteAdminSegment} from '../../quotations/models/quote-route';
import {viewChild} from '@angular/core';
import {protectUnsavedChanges} from '../../../core/guards/unsaved-changes.guard';
import {combineLatest} from 'rxjs';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {DestroyRef} from '@angular/core';
import {CatalogPicker} from '../../../shared/components/catalog-picker/catalog-picker';
import {DecimalPipe} from '@angular/common';
import {TpToastService} from '../../../shared/services/tp-toast.service';
import {CatalogScrollDirective} from '../../../shared/directives/catalog-scroll.directive';
import {Component,inject,signal,computed,OnInit,OnDestroy} from '@angular/core';import {Router,RouterLink,ActivatedRoute} from '@angular/router';import {FormsModule} from '@angular/forms';
import {TravelDataService,TravelRecord,Page,Row} from '../../../data/facades/travel-data.service';import {definitions} from './models/resource-registry';import {catalogDefinition,catalogLabels,catalogKey,catalogAliases} from '../../catalogs/models/catalog-definitions';import {ResourceService} from './services/resource.service';import type {FieldDefinition,ResourceDefinition} from '../../../shared/models/resource-definition';
import {PageHeader} from '../../../shared/components/page-header/page-header';import {Button} from '../../../shared/components/button/button';import {Icon} from '../../../shared/components/icon/icon';import {State} from '../../../shared/components/state/state';import {FilterBar} from '../../../shared/components/filter-bar/filter-bar';import {DataTable} from '../../../shared/components/data-table/data-table';import {ImageCard} from '../../../shared/components/image-card/image-card';import {Dialog} from '../../../shared/components/dialog/dialog';import {ResourceForm} from '../../../shared/components/resource-form/resource-form';
import {QuoteColumnFilters} from '../../quotes/components/quote-column-filters/quote-column-filters';
import {QuoteFilters,emptyQuoteFilters} from '../../quotes/models/quote-filters';
import {TpSelectSearchComponent} from '../../../shared/components/tp-select-search/tp-select-search.component';
import {TpActionMenuItem,TpActionsMenuComponent} from '../../../shared/components/tp-actions-menu/tp-actions-menu.component';
@Component({selector:'tp-catalog',imports:[CatalogPicker,DecimalPipe,CatalogScrollDirective,TpSelectSearchComponent,TpActionsMenuComponent,QuoteColumnFilters,RouterLink,FormsModule,PageHeader,Button,Icon,State,FilterBar,DataTable,ImageCard,Dialog,ResourceForm],templateUrl:'./catalog.html',styleUrl:'./catalog.scss'})
export class Catalog implements OnInit,OnDestroy {toast=inject(TpToastService);
 private editorForm=viewChild<ResourceForm>('editorForm');
 private pendingChanges=protectUnsavedChanges(()=>this.kind!=='circuitos'&&this.editorOpen()&&!this.editorLoading()&&!!this.editorForm()?.hasChanges(),()=>this.kind!=='circuitos'&&(this.saving()||this.removing()));
 canDeactivate(){return this.pendingChanges.confirm();}
 closeEditor(){if(this.canDeactivate())this.editorOpen.set(false);}
 destinationTypeOptions=[{value:'NACIONAL',label:'Nacionales'},{value:'INTERNACIONAL',label:'Internacionales'}];
 quoteTypeOptions=[{value:'individual',label:'Individuales'},{value:'comparativa',label:'Comparativas'}];
 destinationFilters=signal<Row>({soloActivos:false});filtersOpen=signal(false);filterLoading=signal(false);filterError=signal('');filterFields=signal<FieldDefinition[]>([]);
 hotelDestinationId=Number(inject(ActivatedRoute).snapshot.paramMap.get('destinationId'))||undefined;
 destinationName=inject(ActivatedRoute).snapshot.queryParamMap.get('nombre')||'este destino';
 returnTo=inject(ActivatedRoute).snapshot.queryParamMap.get('volver')||'';
 tableColumns=computed(()=>this.kind==='destinos'?[{key:'tipo_turistico_nombre',label:'Clasificación'},{key:'prioridad_label',label:'Prioridad'},{key:'ubicacion_label',label:'Ubicación'}]:this.definition().columns);
 filterCount=computed(()=>Object.values(this.destinationFilters()).filter(Boolean).length);
 rowActions=(record:TravelRecord):TpActionMenuItem[]=>this.kind==='destinos'?[
  {id:'edit',label:'Editar destino',icon:'edit',disabled:!this.canEdit()},
  {id:'content',label:'Configurar preview',icon:'quote',disabled:!this.canEdit()},
  {id:'hotels',label:'Ver hoteles',icon:'hotel',disabled:!this.preview&&!this.data.auth.hasPermission('hoteles.view')},
  {id:'public',label:'Ver página pública',icon:'arrow',disabled:record.status==='Inactivo'},
  ...(record.status!=='Inactivo'?[{id:'deactivate',label:'Desactivar destino',icon:'trash',danger:true,disabled:!this.canEdit()}]:[])
 ]:[{id:'open',label:'Consultar registro',icon:'arrow'}];
  destinationAction(event:{id:string;record:TravelRecord}){const r=event.record;switch(event.id){case 'edit':void this.open(r);break;case 'content':void this.router.navigate(['/admin/destinos',r.id,'contenido']);break;case 'public':void this.router.navigate(['/destinos',r.id]);break;case 'hotels':{const f=this.destinationFilters();const volver=this.router.createUrlTree([this.base,'destinos'],{queryParams:{buscar:this.search()||null,tipo:this.destinationType(),division:f['divisionAreaId']||null,region:f['regionId']||null,pais:f['paisId']||null,clasificacion:f['tipoTuristicoId']||null,activos:f['soloActivos']||null,estadoDestino:f['estado']||null,prioridad:f['prioridad']||null,imagen:f['imagen']||null,ordenListado:f['ordenListado']||null,pagina:this.page().page}}).toString();void this.openDestinationHotels(r,volver);break;}case 'deactivate':this.selected.set(r);this.editorError.set('');this.removeOpen.set(true);}}
  private async openDestinationHotels(record:TravelRecord,volver:string){if(await this.router.navigateByUrl(volver,{replaceUrl:true}))await this.router.navigate([this.base,'destinos',record.id,'hoteles'],{queryParams:{nombre:record.title,volver}});}
 changeDestinationType(value:'NACIONAL'|'INTERNACIONAL'){this.destinationType.set(value);this.destinationFilters.set({soloActivos:false});void this.load();}
  async openDestinationFilters(){if(this.destinationFilters()['soloActivos'])this.destinationFilters.update(f=>({...f,soloActivos:false,estado:'activo'}));this.filtersOpen.set(true);this.filterLoading.set(true);this.filterError.set('');try{
  const national=this.destinationType()==='NACIONAL';
  const [classification,areas,regions,countries]=await Promise.all([
   this.data.cached('destination-filter-types',()=>this.data.destinations.obtenerTiposTuristicosCatalogo(true),300_000),
   national?this.data.cached('destination-filter-areas',()=>this.data.destinations.obtenerCatalogoNacionalesDivisionAreas(),300_000):Promise.resolve([]),
   national?Promise.resolve([]):this.data.cached('destination-filter-regions',()=>this.data.destinations.obtenerCatalogoInternacionalRegiones(),300_000),
   national?Promise.resolve([]):this.data.cached('destination-filter-countries',()=>this.data.destinations.obtenerCatalogoInternacionalPaises(),300_000)
  ]);
  const field=(key:string,label:string,rows:{id:number;nombre:string}[]):FieldDefinition=>({key,label,type:'select',options:[{value:'',label:'Todas las opciones'},...rows.map(r=>({value:r.id,label:r.nombre}))]});
  const classificationField=field('tipoTuristicoId','Clasificación turística',classification);
  classificationField.options!.push({value:'sin',label:'Sin clasificación'});
  this.filterFields.set([
   ...(national?[field('divisionAreaId','División de área',areas)]:[field('regionId','Región',regions),field('paisId','País',countries)]),
   classificationField,
   {key:'estado',label:'Estado del destino',type:'select',options:[{value:'',label:'Activos e inactivos'},{value:'activo',label:'Solo activos'},{value:'inactivo',label:'Solo inactivos'}]},
   {key:'prioridad',label:'Prioridad',type:'select',options:[{value:'',label:'Todas las prioridades'},{value:1,label:'Destacados'},{value:2,label:'Estándar'}]},
   {key:'imagen',label:'Fotografía del destino',type:'select',options:[{value:'',label:'Con y sin fotografía'},{value:'con',label:'Con fotografía'},{value:'sin',label:'Sin fotografía'}]},
   {key:'ordenListado',label:'Ordenar resultados',type:'select',options:[{value:'',label:'Prioridad y orden del catálogo'},{value:'nombre-asc',label:'Nombre: A → Z'},{value:'nombre-desc',label:'Nombre: Z → A'}]}
  ]);
 }catch(e){this.filterError.set('No pudimos cargar las opciones. Intenta nuevamente.');}finally{this.filterLoading.set(false);}}
 applyDestinationFilters(value:Row){this.destinationFilters.set({...value,soloActivos:false});this.filtersOpen.set(false);void this.load();}
 clearDestinationFilters(){this.destinationFilters.set({soloActivos:false});void this.load();}
 pageSize=computed(()=>this.kind==='destinos'?10:24);
  private destinationPage(page:number){if(!this.destinationFiltersRestored){this.destinationFiltersRestored=true;const q=this.route.snapshot.queryParamMap;this.destinationFilters.update(f=>({...f,estado:q.get('estadoDestino')||'',prioridad:Number(q.get('prioridad'))||'',imagen:q.get('imagen')||'',ordenListado:q.get('ordenListado')||'',tipoTuristicoId:q.get('clasificacion')==='sin'?'sin':f['tipoTuristicoId']}));}const f=this.destinationFilters();return this.data.destinationCatalogPage({tipo:this.destinationType(),page,pageSize:this.pageSize(),busqueda:this.search(),soloActivos:!!f['soloActivos'],estado:f['estado']||undefined,prioridad:Number(f['prioridad'])===1?1:Number(f['prioridad'])===2?2:undefined,imagen:f['imagen']||undefined,ordenListado:f['ordenListado']||undefined,sinClasificacion:f['tipoTuristicoId']==='sin',divisionAreaIds:f['divisionAreaId']?[Number(f['divisionAreaId'])]:[],regionIds:f['regionId']?[Number(f['regionId'])]:[],paisIds:f['paisId']?[Number(f['paisId'])]:[],tipoTuristicoId:Number(f['tipoTuristicoId'])||null});}
  private destinationFiltersRestored=false;
 quoteFilters=signal<QuoteFilters>(emptyQuoteFilters());
 changeQuoteFilters(value:QuoteFilters){this.quoteFilters.set(value);clearTimeout(this.timer);this.timer=setTimeout(()=>void this.load(),300);}
 clearQuoteFilters(){clearTimeout(this.timer);this.quoteFilters.set(emptyQuoteFilters());this.status.set('');this.search.set('');void this.load();}
 changeQuoteStatus(value:string){clearTimeout(this.timer);this.status.set(value);void this.load();}
 changeQuoteType(value:boolean){clearTimeout(this.timer);this.multiple.set(value);if(value)this.quoteFilters.update(filters=>({...filters,hotel:''}));void this.load();}
 data=inject(TravelDataService);resources=inject(ResourceService);router=inject(Router);route=inject(ActivatedRoute);kind=this.route.snapshot.data['kind']||'destinos';preview=!!this.route.snapshot.data['preview'];base=this.preview?'/vista-previa':'/admin';
 private destroyRef=inject(DestroyRef);
 catalogTitle=computed(()=>catalogLabels[this.catalog()]||catalogLabels[Object.keys(catalogAliases).find(key=>catalogAliases[key]===this.catalog())||'']||'Catálogos');
 catalogPickerOptions=computed(()=>this.catalogKeys.map(key=>({value:catalogKey(key),label:this.catalogLabels[key]})).sort((a,b)=>a.label.localeCompare(b.label,'es',{sensitivity:'base'})));
  switchCatalog(key:string){if(!this.canDeactivate())return;this.editorOpen.set(false);const routeKey=Object.keys(catalogAliases).find(alias=>catalogAliases[alias]===key)||key;void this.router.navigate([this.base+'/catalogos',routeKey]);}
 catalog=signal(this.kind==='atracciones'?'atracciones':catalogKey(this.route.snapshot.paramMap.get('catalog')||this.route.snapshot.queryParamMap.get('catalog')||'idiomas'));catalogLabels=catalogLabels;catalogKeys=Object.keys(catalogLabels);search=signal(this.route.snapshot.queryParamMap.get('buscar')||'');status=signal(this.route.snapshot.queryParamMap.get('estado')||'');destinationType=signal<'NACIONAL'|'INTERNACIONAL'>('NACIONAL');multiple=signal(false);view=signal('table');loading=signal(true);error=signal('');page=signal<Page>({items:[],total:0,page:0});editorOpen=signal(false);editorLoading=signal(false);editorError=signal('');selected=signal<TravelRecord|null>(null);fields=signal<FieldDefinition[]>([]);value=signal<Row>({});saving=signal(false);removing=signal(false);removeOpen=signal(false);private timer?:ReturnType<typeof setTimeout>;private generation=0;
 definition=computed<ResourceDefinition>(()=>this.kind==='catalogos'||this.kind==='atracciones'?catalogDefinition(this.catalog(),this.kind==='atracciones'):definitions[this.kind]||{kind:'cotizaciones',title:'Cotizaciones',description:'Cada propuesta es el comienzo de una historia. Consulta y da seguimiento a tus solicitudes.',singular:'cotización',icon:'quote',permission:'cotizaciones.edit',fields:[],columns:[{key:'hotel_nombre',label:'Hotel'},{key:'empleado_nombre',label:'Asesor'},{key:'created_at',label:'Fecha'}]});
 canEdit(){return !this.preview&&this.data.auth.hasPermission(this.definition().permission);}
 ngOnInit(){if(this.kind==='catalogos'){let initialized=false;combineLatest([this.route.paramMap,this.route.queryParamMap]).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(([params,query])=>{const key=catalogKey(params.get('catalog')||query.get('catalog')||'idiomas');if(initialized&&key===this.catalog())return;initialized=true;clearTimeout(this.timer);this.catalog.set(key);this.search.set(query.get('buscar')||'');this.editorOpen.set(false);this.removeOpen.set(false);this.selected.set(null);this.view.set(this.definition().visual?'cards':'table');void this.load(0);});return;}const q=this.route.snapshot.queryParamMap;if(this.kind==='destinos'){this.destinationType.set(q.get('tipo')==='INTERNACIONAL'?'INTERNACIONAL':'NACIONAL');this.destinationFilters.set({soloActivos:q.get('activos')==='true',divisionAreaId:Number(q.get('division'))||null,regionId:Number(q.get('region'))||null,paisId:Number(q.get('pais'))||null,tipoTuristicoId:Number(q.get('clasificacion'))||null});}this.view.set(this.kind==='destinos'?'table':this.definition().visual?'cards':'table');void this.load(this.kind==='destinos'?Math.max(0,Number(q.get('pagina'))||0):0);}ngOnDestroy(){clearTimeout(this.timer);this.generation++;}
 async load(page=0){const generation=++this.generation;this.loading.set(true);this.error.set('');try{let data:Page;
 if(this.kind==='destinos')data=await this.destinationPage(page);
 else if(this.kind==='hoteles'&&!this.hotelDestinationId){await this.router.navigate([this.base,'destinos']);return;}
 else if(this.preview){if(this.kind==='hoteles')data=await this.data.resource('hoteles',page,this.search(),this.catalog(),this.destinationType(),this.hotelDestinationId);else if(this.kind==='circuitos'){const rows=await this.data.circuits.listCircuitosPublicos();data={items:rows.map(r=>({id:String(r.id),title:r.nombre,subtitle:'Circuito',image:r.imagen_principal,status:'Activo',raw:r})),total:rows.length,page};}else data={items:[],total:0,page};}
 else data=this.kind==='cotizaciones'?await this.data.quotePage(page,this.search(),this.status(),this.multiple(),this.quoteFilters()):await this.data.resource(this.kind,page,this.search(),this.catalog(),this.destinationType(),this.hotelDestinationId);
 if(generation===this.generation)this.page.set(data);
 }catch(e){if(generation===this.generation)this.error.set(e instanceof Error?e.message:'No pudimos cargar la información.');}finally{if(generation===this.generation)this.loading.set(false);}}
 changeSearch(text:string){this.search.set(text);clearTimeout(this.timer);this.timer=setTimeout(()=>void this.load(),300);}
 async open(record:TravelRecord|null){if(this.kind==='cotizaciones'){if(record)await this.router.navigate(['/admin/cotizaciones',this.multiple()?record.raw['public_id']||record.id:quoteAdminSegment(record.raw['id']||record.id,record.raw['public_id'])],{queryParams:{tipo:this.multiple()?'comparativa':'individual'}});return;}
 this.selected.set(record);this.editorError.set('');this.editorOpen.set(true);this.editorLoading.set(true);
 try{const initial:Row=record?(this.preview?{...record.raw,nombre:record.title,nombre_hotel:record.title}:await this.resources.detail(this.kind,record)):{activo:true,estatus:true,orden:0,prioridad:2,tipo_desino_id:1,catalogo_destino_id:this.hotelDestinationId};this.value.set(initial);this.fields.set(this.preview?this.definition().fields:await this.resources.options(this.definition().fields));}
 catch(e){this.editorError.set(e instanceof Error?e.message:'No pudimos cargar este registro.');}finally{this.editorLoading.set(false);}}
 async save(value:Row){if(!this.canEdit())return;this.saving.set(true);this.editorError.set('');try{await this.resources.save(this.definition(),value,this.selected()?.id||null,this.catalog());this.editorOpen.set(false);this.toast.success('Los cambios se guardaron correctamente.');await this.load(this.page().page);}catch(e){this.toast.error(e instanceof Error?e.message:'No se pudo guardar.');}finally{this.saving.set(false);}}
 async remove(){if(!this.canEdit()||!this.selected())return;this.removing.set(true);this.editorError.set('');try{await this.resources.remove(this.definition(),this.selected()!,this.catalog());this.removeOpen.set(false);this.editorOpen.set(false);this.toast.success(this.kind==='destinos'?'Destino desactivado.':'Registro eliminado.');await this.load();}catch(e){this.toast.error(e instanceof Error?e.message:'No se pudo completar la acción.');}finally{this.removing.set(false);}}
 export(){const keys=['Nombre','Ubicación','Estado'];const lines=[keys,...this.page().items.map(r=>[r.title,r.subtitle,r.status])].map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(','));const url=URL.createObjectURL(new Blob(['\uFEFF'+lines.join('\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=this.kind+'-pagina-'+(this.page().page+1)+'.csv';a.click();URL.revokeObjectURL(url);}
}



