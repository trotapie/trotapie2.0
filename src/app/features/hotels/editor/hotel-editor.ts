import {Component, computed, inject, signal, OnInit} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {ResourceService} from '../../admin/catalog/services/resource.service';
import {hotelsDefinition} from '../models/hotels-definition';
import type {Row} from '../../../data/facades/travel-data.service';
import type {FieldDefinition} from '../../../shared/models/resource-definition';
import {ChangeTracker} from '../../../core/utils/change-snapshot';
import {protectUnsavedChanges} from '../../../core/guards/unsaved-changes.guard';
import {PageHeader} from '../../../shared/components/page-header/page-header';
import {Button} from '../../../shared/components/button/button';
import {Field} from '../../../shared/components/field/field';
import {State} from '../../../shared/components/state/state';
import {TpSelectSearchComponent} from '../../../shared/components/tp-select-search/tp-select-search.component';
import {HotelDestinationSelect} from '../../../shared/components/hotel-destination-select/hotel-destination-select';
import {LocationEditor} from '../../../shared/components/location-editor/location-editor';
import {ImagePreview} from '../../../shared/components/image-preview/image-preview';
import {Dialog} from '../../../shared/components/dialog/dialog';
import {TpToastService} from '../../../shared/services/tp-toast.service';
import {driveImageThumbnailUrl} from '../../../data/utils/drive-image-url';
import {classifyHotelPhoto,classifyHotelPhotos,groupHotelPhotos} from '../models/hotel-photo-classification';
import type {TpSelectSearchOption} from '../../../shared/components/tp-select-search/tp-select-search.component';
import {TpMultiselectComponent} from '../../../shared/components/tp-multiselect/tp-multiselect.component';
import {HOTEL_TIME_FIELDS,hotelIds,hotelDraftValidation,hotelContentValue,setHotelContentValue} from '../models/hotel-editor-model';
import {LanguageMenu} from '../../../shared/components/language-menu/language-menu';

@Component({
  selector:'tp-hotel-editor',
  imports:[RouterLink,FormsModule,PageHeader,Button,Field,State,TpSelectSearchComponent,TpMultiselectComponent,HotelDestinationSelect,LocationEditor,ImagePreview,Dialog,LanguageMenu],
  templateUrl:'./hotel-editor.html',
  styleUrls:['./hotel-editor.scss','./hotel-photo-folders.scss','./hotel-details.scss']
})
export class HotelEditor implements OnInit {
  private resources=inject(ResourceService);
  private route=inject(ActivatedRoute);
  private router=inject(Router);
  private toast=inject(TpToastService);
  private changes=new ChangeTracker<Row>();
  readonly id=this.route.snapshot.paramMap.get('id')!;
  readonly returnTo=(()=>{const value=this.route.snapshot.queryParamMap.get('volver')||'';return this.router.parseUrl(value.startsWith('/admin/')?value:'/admin/hoteles');})();
  readonly loading=signal(true);
  readonly saving=signal(false);
  readonly importingImages=signal(false);
  readonly importError=signal('');
  readonly error=signal('');
  readonly model=signal<Row|null>(null);
  readonly fields=signal<FieldDefinition[]>([]);
  readonly optionsError=signal('');
  readonly optionsLoading=signal(false);
  readonly regimes=signal<TpSelectSearchOption[]>([]);
  readonly activities=signal<TpSelectSearchOption[]>([]);
  readonly roomTypes=signal<TpSelectSearchOption[]>([]);
  readonly discounts=signal<TpSelectSearchOption[]>([]);
  readonly languages=signal<Array<{id:number;codigo:string;nombre:string}>>([]);
  readonly contentLanguage=signal('es');
  readonly contentLanguageCodes=computed(()=>['es',...this.languages().filter(language=>language.codigo!=='es').map(language=>language.codigo)]);
  private contentLanguageId(){return this.contentLanguage()==='es'?1:this.languages().find(language=>language.codigo===this.contentLanguage())?.id||1;}
  changeContentLanguage(code:string){if(this.contentLanguageCodes().includes(code))this.contentLanguage.set(code);}
  setLocation(value:string){this.model.update(model=>model?{...model,ubicacion:value}:model);}
  contentValue(key:'nombre_hotel'|'descripcion'|'plan_todo_incluido'){return hotelContentValue(this.model(),this.contentLanguageId(),key);}
  setContentValue(key:'nombre_hotel'|'descripcion'|'plan_todo_incluido',value:string){this.model.update(model=>setHotelContentValue(model!,this.contentLanguageId(),key,value));}
  readonly translating=signal(false);
  readonly translationError=signal('');
  readonly timeFields=HOTEL_TIME_FIELDS;
  readonly selectionPreview=signal<'regimeIds'|'activityIds'|'roomTypeIds'|null>(null);
  selectionCount(key:'regimeIds'|'activityIds'|'roomTypeIds'){return hotelIds(this.model()?.[key]).length;}
  selectionTitle(){return this.selectionPreview()==='regimeIds'?'Regímenes seleccionados':this.selectionPreview()==='activityIds'?'Actividades y amenidades seleccionadas':'Tipos de habitación seleccionados';}
  selectedItems(){
    const key=this.selectionPreview();if(!key)return [];
    const options=key==='regimeIds'?this.regimes():key==='activityIds'?this.activities():this.roomTypes();
    const ids=hotelIds(this.model()?.[key]);
    return this.selectionOptions(key,options).filter(option=>ids.includes(Number(option.value)));
  }
  readonly imageTypes=signal<TpSelectSearchOption[]>([]);
  readonly imageTypesLoading=signal(false);
  readonly imageTypesError=signal('');
  readonly selectedPhotos=signal(new Set<string>());
  readonly photoGroups=computed(()=>groupHotelPhotos(this.photos(),this.model()?.['imagenes']||[],this.imageTypes()));
  readonly activePhotoFolder=signal<number|null|'all'>(null);
  readonly photoFolders=computed(()=>this.photoGroups().filter(group=>group.id===null||group.urls.length>0||group.id===this.activePhotoFolder()));
  readonly visiblePhotos=computed(()=>this.activePhotoFolder()==='all'?this.photos():this.photoGroups().find(group=>group.id===this.activePhotoFolder())?.urls||[]);
  readonly photoFolderLabel=computed(()=>this.activePhotoFolder()==='all'?'Todas las imágenes':this.activePhotoFolder()===null?'Sin tipo asignado':this.photoGroups().find(group=>group.id===this.activePhotoFolder())?.label||'Carpeta vacía');
  readonly bulkTypeOptions=computed(()=>[{value:'',label:'Sin tipo'},...this.imageTypes()]);
  bulkPhotoType:string|number|null=null;
  readonly editingPhoto=signal('');
  editingPhotoType:number|string|null=null;
  private imageTypesGeneration=0;
  private optionsGeneration=0;
  readonly tab=signal('information');
  readonly preview=signal('');
  readonly tabs=[{id:'information',label:'Información',icon:'edit'},{id:'services',label:'Servicios y habitaciones',icon:'hotel'},{id:'additional',label:'Datos adicionales',icon:'calendar'},{id:'location',label:'Ubicación',icon:'pin'},{id:'photos',label:'Fotografías',icon:'star'}];
  newImage='';
  driveFolder='';
  private pendingChanges=protectUnsavedChanges(()=>this.changes.hasChanges(this.model())||!!this.newImage.trim(),()=>this.saving()||this.importingImages()||this.translating());
  canDeactivate(){return this.pendingChanges.confirm();}

  async ngOnInit(){
    this.loading.set(true);this.error.set('');
    this.fields.set(hotelsDefinition.fields.filter(field=>!['fondo','ubicacion','galleryUrls','regimen_id'].includes(field.key)));
    void this.loadOptions();
    void this.loadImageTypes();
    try{
      const model=await this.resources.detail('hoteles',{id:this.id,title:'',subtitle:'',image:'',status:'',raw:{catalogo_destino_id_resuelto:Number(this.route.snapshot.queryParamMap.get('destino'))||undefined}});
      this.model.set(model);this.changes.capture(model);this.selectedPhotos.set(new Set());this.bulkPhotoType=null;
    }catch(error){this.error.set(error instanceof Error?error.message:'No pudimos cargar el hotel.');}
    finally{this.loading.set(false);}
  }

  async loadOptions(){
    const generation=++this.optionsGeneration;
    this.optionsLoading.set(true);this.optionsError.set('');
    try{
      const data=this.resources.data;
      const [regimes,activities,rooms,discounts,languages]=await Promise.all([
        data.legacy.obtenerRegimenesAdmin(),data.legacy.obtenerActividadesAdmin(),
        data.catalogs.obtenerCatalogoAdmin('tipos_habitacion'),data.legacy.obtenerDescuentosAdmin(),
        data.legacy.obtenerIdiomasPreviewAdmin(),
      ]);
      if(generation!==this.optionsGeneration)return;
      this.regimes.set(regimes.map(item=>({value:Number(item.id),label:item.descripcion})));
      this.activities.set(activities.map(item=>({value:item.id,label:item.descripcion+(item.activo?'':' (inactiva)')})));
      this.roomTypes.set(rooms.map((item:Row)=>({value:Number(item['id']),label:item['nombre_habitacion']})));
      this.discounts.set([{value:'',label:'Sin descuento'},...discounts.map(item=>({value:item.id,label:item.tipo_descuento}))]);
      this.languages.set(languages);
    }catch{
      if(generation===this.optionsGeneration)this.optionsError.set('No pudimos cargar los catálogos del hotel. Reintenta sin perder tus cambios.');
    }finally{if(generation===this.optionsGeneration)this.optionsLoading.set(false);}
  }

  selectionOptions(key:'regimeIds'|'activityIds'|'roomTypeIds',options:TpSelectSearchOption[]):TpSelectSearchOption[]{
    const selected=hotelIds(this.model()?.[key]);
    // Keep saved IDs available even when their catalog entry has no translation.
    return [...options,...selected.filter(id=>!options.some(option=>Number(option.value)===id)).map(id=>({value:id,label:`Registro guardado #${id}`}))];
  }
  primaryRegimeOptions(){return [{value:'',label:'Sin régimen principal'},...this.selectionOptions('regimeIds',this.regimes()).filter(option=>hotelIds(this.model()?.['regimeIds']).includes(Number(option.value)))];}
  changeSelection(key:'regimeIds'|'activityIds'|'roomTypeIds',values:unknown){
    const ids=hotelIds(values);
    this.model.update(model=>{const next={...model!,[key]:ids};if(key==='regimeIds'&&!ids.includes(Number(next['regimen_id'])))next['regimen_id']=ids.length===1?ids[0]:null;return next;});
  }
  async translate(){
    const model=this.model();if(!model||this.translating()||this.saving())return;
    if(!String(model['nombre_hotel']||'').trim()){this.translationError.set('Escribe primero el nombre del hotel en Información.');return;}
    if(!window.confirm('¿Generar las traducciones desde español? Se reemplazarán los textos de los otros idiomas en este borrador.'))return;
    this.translating.set(true);this.translationError.set('');
    try{
      const [content,plans]=await Promise.all([
        this.resources.data.legacy.traducirDesdeEspanol({title:model['nombre_hotel'],description:model['descripcion']||''}),
        model['planDescripcion']?.trim()?this.resources.data.legacy.traducirDesdeEspanol({title:'',description:model['planDescripcion']}):Promise.resolve(null),
      ]);
      const targets=this.languages().filter(language=>language.codigo!=='es');
      for(const language of targets){
        const translated=content[language.codigo];
        if(!translated?.title?.trim()||(model['descripcion']?.trim()&&!translated?.description?.trim())||(plans&&!plans[language.codigo]?.description?.trim()))throw new Error(`No se recibió la traducción completa a ${language.nombre}. Tus textos anteriores se conservan.`);
      }
      for(const language of targets){
        this.model.update(model=>setHotelContentValue(model!,language.id,'nombre_hotel',content[language.codigo].title));
        this.model.update(model=>setHotelContentValue(model!,language.id,'descripcion',content[language.codigo].description||''));
        this.model.update(model=>setHotelContentValue(model!,language.id,'plan_todo_incluido',plans?.[language.codigo]?.description||''));
      }
      this.toast.success('Traducciones generadas en el borrador. Pulsa Guardar hotel para conservarlas.');
    }catch(error){this.translationError.set(error instanceof Error?error.message:'No pudimos generar las traducciones.');}
    finally{this.translating.set(false);}
  }

  photos():string[]{return String(this.model()?.['galleryUrls']||'').split(/\r?\n/).map(url=>url.trim()).filter(Boolean);}
  async loadImageTypes(){
    const generation=++this.imageTypesGeneration;
    this.imageTypesLoading.set(true);this.imageTypesError.set('');
    try{
      const types=await this.resources.data.legacy.obtenerTiposImagenAdmin();
      if(generation===this.imageTypesGeneration)this.imageTypes.set(types.map(type=>({value:type.id,label:type.descripcion})));
    }catch{
      if(generation===this.imageTypesGeneration)this.imageTypesError.set('No pudimos cargar las clasificaciones de imágenes.');
    }finally{if(generation===this.imageTypesGeneration)this.imageTypesLoading.set(false);}
  }
  photoType(url:string):number|null{
    return Number(this.model()?.['imagenes']?.find((image:Row)=>image['url_imagen']===url)?.['tipo_imagen_id'])||null;
  }
  photoTypeOptions(url:string):TpSelectSearchOption[]{
    const options:TpSelectSearchOption[]=[{value:'',label:'Sin tipo'},...this.imageTypes()];
    const id=this.photoType(url);
    if(!id||options.some(option=>Number(option.value)===id))return options;
    const image=this.model()?.['imagenes']?.find((item:Row)=>item['url_imagen']===url);
    const label=image?.['tipo']?.traducciones?.find((translation:Row)=>translation['lang']==='es')?.descripcion;
    return [{value:id,label:label||`Tipo #${id}`},...options];
  }
  classifyPhoto(url:string,value:string|number|null){
    this.model.update(model=>({...model!,imagenes:classifyHotelPhoto(model!['imagenes']||[],url,Number(value)||null)}));
    this.togglePhotoSelection(url,false);
  }
  photoTypeLabel(url:string){
    const id=this.photoType(url);
    return id?this.photoTypeOptions(url).find(option=>Number(option.value)===id)?.label||'Sin tipo':'Sin tipo';
  }
  openPhotoEditor(url:string){this.editingPhotoType=this.photoType(url);this.editingPhoto.set(url);}
  applyPhotoClassification(){
    const url=this.editingPhoto();
    if(!url||!this.photos().includes(url)||this.imageTypesLoading()||this.imageTypesError())return;
    this.classifyPhoto(url,this.editingPhotoType);this.editingPhoto.set('');
  }
  togglePhotoSelection(url:string,selected:boolean){
    this.selectedPhotos.update(current=>{
      const next=new Set(current);
      if(selected)next.add(url);else next.delete(url);
      return next;
    });
  }
  selectPhotoFolder(id:number|null|'all'){this.activePhotoFolder.set(id);this.clearPhotoSelection();}
  selectAllPhotos(){this.selectedPhotos.set(new Set(this.visiblePhotos()));}
  clearPhotoSelection(){this.selectedPhotos.set(new Set());}
  classifySelectedPhotos(){
    if(!this.model()||this.saving()||this.importingImages()||this.imageTypesLoading()||this.imageTypesError()||this.bulkPhotoType===null)return;
    const selected=[...this.selectedPhotos()];
    if(!selected.length)return;
    this.model.update(model=>({...model!,imagenes:classifyHotelPhotos(model!['imagenes']||[],this.photos(),selected,Number(this.bulkPhotoType)||null)}));
    this.selectedPhotos.set(new Set());
    this.toast.success('Clasificación aplicada a las fotografías seleccionadas. Pulsa Guardar hotel para conservarla.');
  }
  async importDrive(){
    if(!this.driveFolder.trim()||!this.model()||this.saving()||this.importingImages())return;
    this.importingImages.set(true);this.importError.set('');
    try{
      const folders=await this.resources.data.legacy.obtenerImagenesActividadDesdeDrive(this.driveFolder.trim());
      const urls=this.photos();
      const known=new Set(urls.map(driveImageThumbnailUrl));
      const added:string[]=[];
      for(const folder of folders)for(const image of folder.imagenes){
        const url=driveImageThumbnailUrl(image.thumbnailUrl?.trim()||image.publicImageUrl);
        if(!/^https?:\/\//i.test(url)||known.has(url))continue;
        known.add(url);added.push(url);
      }
      if(added.length){
        this.model.update(model=>({...model!,galleryUrls:[...urls,...added].join('\n'),fondo:model!['fondo']||added[0]}));
        this.selectPhotoFolder(null);
        this.toast.success(`${added.length} fotografías importadas. Pulsa Guardar hotel para conservarlas.`);
      }else this.toast.warning('No hay fotografías nuevas para agregar desde esta carpeta.');
      this.driveFolder='';
    }catch(error){this.importError.set(error instanceof Error?error.message:'No pudimos importar desde Drive. Intenta nuevamente.');}
    finally{this.importingImages.set(false);}
  }
  addPhoto(){
    const url=driveImageThumbnailUrl(this.newImage);
    if(!/^https?:\/\//i.test(url)){this.toast.error('Escribe una dirección pública http o https.');return;}
    const urls=this.photos();
    if(!urls.some(photo=>driveImageThumbnailUrl(photo)===url)){
      this.model.update(model=>({...model!,galleryUrls:[...urls,url].join('\n'),fondo:model!['fondo']||url}));
      this.selectPhotoFolder(null);
    }
    this.newImage='';
  }
  removePhoto(url:string){
    if(!window.confirm('¿Eliminar esta fotografía? El cambio se aplicará al guardar el hotel.'))return;
    const urls=this.photos().filter(photo=>photo!==url);
    this.model.update(model=>({...model!,galleryUrls:urls.join('\n'),fondo:model!['fondo']===url?urls[0]||'':model!['fondo']}));
    this.togglePhotoSelection(url,false);
  }
  async save(){
    const model=this.model();
    if(!model||this.saving()||this.importingImages()||this.translating())return;
    if(!String(model['nombre_hotel']||'').trim()||!Number(model['catalogo_destino_id'])){
      this.tab.set('information');this.error.set('Completa el nombre del hotel y el destino del catálogo.');return;
    }
    if(model['orden']!==''&&model['orden']!=null&&(!Number.isFinite(Number(model['orden']))||Number(model['orden'])<0)){
      this.tab.set('information');this.error.set('El orden de presentación debe ser mayor o igual a cero.');return;
    }
    if(this.newImage.trim()){this.tab.set('photos');this.error.set('Agrega la fotografía pendiente o limpia su dirección antes de guardar.');return;}
    const validation=hotelDraftValidation(model);
    if(validation){this.error.set(validation);this.tab.set('additional');return;}
    this.saving.set(true);this.error.set('');
    try{
      await this.resources.save(hotelsDefinition,model,this.id);
      this.toast.success('Los cambios del hotel se guardaron correctamente.');
      // Refresh persisted image IDs before allowing another save.
      this.model.set(null);this.changes.capture(null);await this.ngOnInit();
    }catch(error){this.error.set(error instanceof Error?error.message:'No pudimos guardar el hotel.');}
    finally{this.saving.set(false);}
  }
}
