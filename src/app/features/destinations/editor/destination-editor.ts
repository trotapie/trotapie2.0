import {spanishImageText,imageTranslationKey,needsImageTranslation} from '../utils/image-translation';
import {applyPhotoBulkAction,type PhotoBulkAction} from '../utils/photo-bulk-action';
import {ChangeTracker} from '../../../core/utils/change-snapshot';
import {protectUnsavedChanges} from '../../../core/guards/unsaved-changes.guard';
import {TpToastService} from '../../../shared/services/tp-toast.service';
import {AttractionsWorkspace} from '../components/attractions-workspace/attractions-workspace';
import {LanguageMenu} from '../../../shared/components/language-menu/language-menu';
import {LocationMap} from '../../../shared/components/location-map/location-map';
import {driveImageThumbnailUrl} from '../../../data/utils/drive-image-url';
import {TpSelectSearchComponent} from '../../../shared/components/tp-select-search/tp-select-search.component';
import {availableQuickFactTypes, appendQuickFact} from '../utils/quick-facts';
import {Component,inject,signal,OnInit} from '@angular/core';import {RouterLink,ActivatedRoute} from '@angular/router';import {FormsModule} from '@angular/forms';import {DestinationEditorService} from '../services/destination-editor.service';import type {IPreviewDestinoAdmin,IActividadPreviewAdmin} from '../../../data/queries/supabase.service';import {PageHeader} from '../../../shared/components/page-header/page-header';import {Button} from '../../../shared/components/button/button';import {Field} from '../../../shared/components/field/field';import {State} from '../../../shared/components/state/state';import {Dialog} from '../../../shared/components/dialog/dialog';import {ImageComposer} from '../../../shared/components/image-composer/image-composer';import {Icon} from '../../../shared/components/icon/icon';
@Component({selector:'tp-destination-editor',imports:[AttractionsWorkspace,LanguageMenu,LocationMap,TpSelectSearchComponent,RouterLink,FormsModule,PageHeader,Button,Field,State,Dialog,ImageComposer,Icon],templateUrl:'./destination-editor.html',styleUrl:'./destination-editor.scss'})
export class DestinationEditor implements OnInit {toast=inject(TpToastService);service=inject(DestinationEditorService);route=inject(ActivatedRoute);id=Number(this.route.snapshot.paramMap.get('id'));loading=signal(true);error=signal('');saving=signal(false);model=signal<IPreviewDestinoAdmin|null>(null);tab=signal('text');language=signal(1);activity=signal<IActividadPreviewAdmin|null>(null);image=signal<Record<string,any>|null>(null);imageDialog=signal(false);newImage='';driveFolder='';translatingImage=signal(false);private originalImage:Record<string,any>|null=null;private translatedKeys=new WeakMap<object,string>();private editorTranslationKey:string|undefined;private dragIndex:number|null=null;
  private changes=new ChangeTracker<IPreviewDestinoAdmin>();
  readonly locationOpen=signal(false);
  readonly importingImages=signal(false);
  bulkImages(a:IActividadPreviewAdmin,images:Record<string,any>[],action:PhotoBulkAction){
    if(this.saving()||!this.service.data.auth.hasPermission('destinos.edit')||!this.model()?.actividades.includes(a))return;
    const selected=(a.imagenes||[]).filter(image=>images.includes(image));
    if(!selected.length)return;
    if(action==='delete'&&!window.confirm(`¿Eliminar ${selected.length} fotografías de esta atracción? La eliminación se aplicará al guardar el contenido del destino.`))return;
    const previous=a.imagenes||[];
    a.imagenes=applyPhotoBulkAction(previous,selected,action);
    // Preserve translation tracking for the updated image objects.
    if(action!=='delete')a.imagenes.forEach((image,index)=>{const key=this.translatedKeys.get(previous[index]);if(key)this.translatedKeys.set(image,key);});
    if(action==='delete'&&selected.some(image=>image.imagen_url===a.imagen_fondo))a.imagen_fondo=a.imagenes.find(image=>image.activa)?.imagen_url||a.imagenes[0]?.imagen_url||'';
    this.model.set({...this.model()!});
    this.toast.success('Fotografías actualizadas. Guarda el contenido del destino para conservar los cambios.');
  }
  toggleImage(a:IActividadPreviewAdmin,image:Record<string,any>,active:boolean){
    if(this.saving()||!this.service.data.auth.hasPermission('destinos.edit')||!a.imagenes?.includes(image as any))return;
    image['activa']=active;this.model.set({...this.model()!});
  }
  readonly factDialog=signal(false);
  readonly factError=signal('');
  factType: number|null=null;
  factValue='';
  private factLanguage=1;
  private factChanges=new ChangeTracker();
  private factDraft(){return {type:this.factType,value:this.factValue};}
  availableFactOptions(){const model=this.model();return model?availableQuickFactTypes(model).map(type=>({value:type.id,label:type.nombre||type.clave})):[];}
  openFact(){
    if(this.saving()||!this.service.data.auth.hasPermission('destinos.edit')||!this.availableFactOptions().length)return;
    this.factType=Number(this.availableFactOptions()[0].value);this.factValue='';this.factLanguage=this.language();this.factError.set('');this.factChanges.capture(this.factDraft());this.factDialog.set(true);
  }
  closeFact(){if(!this.saving()&&this.pendingChanges.confirm(()=>this.factChanges.hasChanges(this.factDraft())))this.factDialog.set(false);}
  factLanguageName(){return this.model()?.idiomas.find(language=>language.id===this.factLanguage)?.nombre||'';}
  addFact(){
    const model=this.model();if(!model||this.saving()||!this.factDialog()||!this.service.data.auth.hasPermission('destinos.edit'))return;
    try{this.model.set(appendQuickFact(model,Number(this.factType),this.factLanguage,this.factValue));this.factDialog.set(false);this.toast.success('Dato rápido agregado. Guarda el contenido para conservarlo.');}
    catch(error){this.factError.set(error instanceof Error?error.message:'No pudimos agregar el dato rápido.');}
  }
  private imageChanges=new ChangeTracker();
  private pendingChanges=protectUnsavedChanges(()=>this.changes.hasChanges(this.model())||(this.imageDialog()&&this.imageChanges.hasChanges(this.image()))||(this.factDialog()&&this.factChanges.hasChanges(this.factDraft())),()=>this.saving()||this.translatingImage());
  canDeactivate(){return this.pendingChanges.confirm();}
  closeImage(){if(this.pendingChanges.confirm(()=>this.imageDialog()&&this.imageChanges.hasChanges(this.image())))this.imageDialog.set(false);}
  reorderActivities(event:{from:number;to:number}){this.startDrag(event.from);this.drop(event.to);}
 contentLanguageCode(){return this.model()?.idiomas.find(item=>item.id===this.language())?.codigo||'es';}
 contentLanguageCodes(){return this.model()?.idiomas.map(item=>item.codigo)||[];}
 changeContentLanguage(code:string){const item=this.model()?.idiomas.find(item=>item.codigo===code);if(item)this.language.set(item.id);}
  ngOnInit(){void this.load();}async load(){this.loading.set(true);try{const m=await this.service.load(this.id);this.model.set(m);for(const activity of m.actividades)for(const image of activity.imagenes||[])this.translatedKeys.set(image,imageTranslationKey(image,m.idiomas));this.language.set(m.idiomas.find(l=>l.codigo==='es')?.id||m.idiomas[0]?.id||1);this.changes.capture(m);}catch(e){this.error.set(e instanceof Error?e.message:'No se pudo cargar el destino.');}finally{this.loading.set(false);}}
 translation(){return this.model()?.traducciones.find(t=>t.idioma_id===this.language());}
  async save(){if(!this.model()||this.saving())return;this.saving.set(true);this.error.set('');try{for(const activity of this.model()!.actividades)for(const image of activity.imagenes||[]){if(needsImageTranslation(image,this.model()!.idiomas,this.translatedKeys.get(image))){await this.prepareImageTranslation(image);this.translatedKeys.set(image,imageTranslationKey(image,this.model()!.idiomas));}}await this.service.save(this.id,this.model()!);this.changes.capture(this.model());this.toast.success('Contenido del destino guardado.');await this.load();}catch(e){this.toast.error(e instanceof Error?e.message:'No pudimos guardar el destino.');}finally{this.saving.set(false);}}
 addActivity(){const m=this.model()!;m.actividades.push({id:null,activo:true,orden:m.actividades.length+1,imagen_fondo:'',imagenes:[],traducciones:Object.fromEntries(m.idiomas.map(l=>[l.id,{nombre:'',descripcion:''}]))});this.model.set({...m});}
 move(index:number,direction:number){const m=this.model()!;const target=index+direction;if(target<0||target>=m.actividades.length)return;const rows=[...m.actividades];[rows[index],rows[target]]=[rows[target],rows[index]];m.actividades=rows.map((a,i)=>({...a,orden:i+1}));this.model.set({...m});}
 startDrag(i:number){this.dragIndex=i;}drop(i:number){if(this.dragIndex===null)return;const m=this.model()!,rows=[...m.actividades];const item=rows.splice(this.dragIndex,1)[0];rows.splice(i,0,item);m.actividades=rows.map((a,j)=>({...a,orden:j+1}));this.model.set({...m});this.dragIndex=null;}
 activityText(a:IActividadPreviewAdmin){a.traducciones??={};a.traducciones[this.language()]??={nombre:'',descripcion:''};return a.traducciones[this.language()];}
  async toggleActivity(a:IActividadPreviewAdmin,active:boolean){if(a.id){this.saving.set(true);try{await this.service.data.destinations.actualizarActivoActividadDestinoAdmin(this.id,a.id,active);a.activo=active;this.changes.acceptSaved(saved=>{const activity=saved.actividades.find(item=>item.id===a.id);if(activity)activity.activo=active;});this.model.set({...this.model()!});}catch(e){this.toast.error('No pudimos cambiar el estado de la atracción.');}finally{this.saving.set(false);}}else{a.activo=active;this.model.set({...this.model()!});}}
  addImage(a:IActividadPreviewAdmin){if(!/^https?:\/\//i.test(this.newImage))return;const url=driveImageThumbnailUrl(this.newImage);a.imagenes??=[];a.imagenes.push({id:undefined,imagen_url:url,activa:!a.imagenes.length,orden:a.imagenes.length+1} as any);if(!a.imagen_fondo)a.imagen_fondo=url;this.newImage='';this.model.set({...this.model()!});}
  openImage(a:IActividadPreviewAdmin,i:Record<string,any>){this.activity.set(a);this.originalImage=i;this.editorTranslationKey=this.translatedKeys.get(i);this.image.set(structuredClone(i));this.imageChanges.capture(this.image());this.imageDialog.set(true);}
 async prepareImageTranslation(value:Record<string,any>){const languages=this.model()?.idiomas||[];const es=spanishImageText(value,languages);if(!es.title&&!es.description)return;const result=await this.service.data.legacy.traducirDesdeEspanol(es);const translations=structuredClone(value['traducciones']||{});for(const lang of languages){if(lang.codigo==='es')continue;const item=result[lang.codigo];if(!item||(es.title&&!item.title?.trim())||(es.description&&!item.description?.trim()))throw new Error('No se completaron las traducciones. Intenta guardar de nuevo.');translations[lang.id]={nombre:item.title||'',descripcion:item.description||''};}value['traducciones']=translations;}
  async saveImage(){if(this.saving()||this.translatingImage()||!this.image())return;this.saving.set(true);try{const value=structuredClone(this.image()!);if(needsImageTranslation(value,this.model()?.idiomas||[],this.editorTranslationKey)){this.translatingImage.set(true);await this.prepareImageTranslation(value);this.image.set(value);this.editorTranslationKey=imageTranslationKey(value,this.model()?.idiomas||[]);}if(!this.activity()?.id||!value['id']){if(this.originalImage){Object.assign(this.originalImage,value);this.translatedKeys.set(this.originalImage,this.editorTranslationKey!);this.model.set({...this.model()!});this.imageDialog.set(false);this.toast.warning('Diseño y traducciones preparados. Guarda el contenido del destino para conservarlos.');}return;}await this.service.imageStyle(this.activity()!.id!,value);const existing=this.activity()?.imagenes?.find(i=>i.id===value['id']);if(existing){Object.assign(existing,value);this.translatedKeys.set(existing,imageTranslationKey(value,this.model()?.idiomas||[]));}this.changes.acceptSaved(saved=>{const image=saved.actividades.find(item=>item.id===this.activity()?.id)?.imagenes?.find(item=>item.id===value['id']);if(image)Object.assign(image,value);});this.imageDialog.set(false);this.toast.success('Diseño y textos de la fotografía guardados.');}catch(e){this.toast.error(e instanceof Error?e.message:'No pudimos guardar el diseño.');}finally{this.saving.set(false);this.translatingImage.set(false);}}
 async translateImage(value:Record<string,any>){if(this.translatingImage()||this.saving())return;const es=spanishImageText(value,this.model()?.idiomas||[]);if(!es.title&&!es.description){this.toast.warning('Escribe el título o la descripción en español antes de traducir.');return;}this.translatingImage.set(true);try{const prepared=structuredClone(value);await this.prepareImageTranslation(prepared);this.image.set(prepared);this.editorTranslationKey=imageTranslationKey(prepared,this.model()?.idiomas||[]);this.toast.success('Traducciones preparadas. Guarda el diseño para conservarlas.');}catch(e){this.toast.error(e instanceof Error?e.message:'No pudimos traducir la fotografía.');}finally{this.translatingImage.set(false);}}
  async importDrive(a:IActividadPreviewAdmin){if(!this.driveFolder.trim()||this.saving())return;this.saving.set(true);this.importingImages.set(true);try{const folders=await this.service.data.legacy.obtenerImagenesActividadDesdeDrive(this.driveFolder);a.imagenes??=[];for(const folder of folders)for(const img of folder.imagenes)a.imagenes.push({imagen_url:driveImageThumbnailUrl(img.thumbnailUrl?.trim()||img.publicImageUrl),carpeta_nombre:folder.nombre,nombre:img.nombre,activa:false,orden:a.imagenes.length+1} as any);this.model.set({...this.model()!});this.toast.success('Fotografías importadas. Guarda el destino para conservarlas.');}catch(e){this.toast.error(e instanceof Error?e.message:'No pudimos importar desde Drive.');}finally{this.importingImages.set(false);this.saving.set(false);}}
}


