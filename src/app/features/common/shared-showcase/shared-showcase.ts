import {Component,inject,signal,OnDestroy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {QUOTE_STATUS_OPTIONS} from '../../quotations/models/quote-status';
import {PageHeader} from '../../../shared/components/page-header/page-header';
import {Button} from '../../../shared/components/button/button';
import {Dialog} from '../../../shared/components/dialog/dialog';
import {ResourceForm} from '../../../shared/components/resource-form/resource-form';
import {TpInputComponent} from '../../../shared/components/tp-input/tp-input.component';
import {TpTextareaComponent} from '../../../shared/components/tp-textarea/tp-textarea.component';
import {TpSearchInputComponent} from '../../../shared/components/tp-search-input/tp-search-input.component';
import {TpSelectSearchComponent} from '../../../shared/components/tp-select-search/tp-select-search.component';
import {TpMultiselectComponent} from '../../../shared/components/tp-multiselect/tp-multiselect.component';
import {PhoneInputComponent} from '../../../shared/components/phone-input/phone-input.component';
import {TimePickerComponent} from '../../../shared/components/time-picker/time-picker.component';
import {DateRangeFilterComponent} from '../../../shared/components/date-range-filter/date-range-filter.component';
import {CustomSwitchComponent} from '../../../shared/components/custom-switch/custom-switch.component';
import {ColorPickerComponent} from '../../../shared/components/color-picker/color-picker.component';
import {TpActionsMenuComponent} from '../../../shared/components/tp-actions-menu/tp-actions-menu.component';
import {TpToastService} from '../../../shared/services/tp-toast.service';
import {TpBarChartComponent} from '../../../shared/components/charts/tp-bar-chart/tp-bar-chart.component';
import {TpDonutChartComponent} from '../../../shared/components/charts/tp-donut-chart/tp-donut-chart.component';
import {TpAreaChartComponent} from '../../../shared/components/charts/tp-area-chart/tp-area-chart.component';
import {FolderImageManagerComponent,FolderImageManagerFolder} from '../../../shared/components/folder-image-manager/folder-image-manager.component';
import {BlockingLoaderComponent} from '../../../shared/components/blocking-loader/blocking-loader.component';
import {ImagenesCarruselComponent} from '../../../shared/components/imagenes-carrusel/imagenes-carrusel.component';
import {BannerComponent} from '../../../shared/components/banner/banner.component';
import {ImporteMxnBlurDirective} from '../../../shared/directives/importe.directive';
import {PorcentajeBlurDirective} from '../../../shared/directives/porcentajeBlur.directive';
import type {FieldDefinition} from '../../../shared/models/resource-definition';
import {DashboardStatistics,DashboardSnapshot} from '../../admin/dashboard/components/dashboard-statistics/dashboard-statistics';

@Component({selector:'tp-shared-showcase',imports:[DashboardStatistics,FormsModule,PageHeader,Button,Dialog,ResourceForm,TpInputComponent,TpTextareaComponent,TpSearchInputComponent,TpSelectSearchComponent,TpMultiselectComponent,PhoneInputComponent,TimePickerComponent,DateRangeFilterComponent,CustomSwitchComponent,ColorPickerComponent,TpActionsMenuComponent,TpBarChartComponent,TpDonutChartComponent,TpAreaChartComponent,FolderImageManagerComponent,BlockingLoaderComponent,ImagenesCarruselComponent,BannerComponent,ImporteMxnBlurDirective,PorcentajeBlurDirective],templateUrl:'./shared-showcase.html',styleUrl:'./shared-showcase.scss'})
export class SharedShowcase implements OnDestroy {
  statisticsExample:DashboardSnapshot={total:15,quoted:10,pending:3,recent:['Hotel Costa','Hotel Costa','Hotel Jardín','Hotel Centro','Hotel Jardín'].map((hotel,index)=>({id:String(index),title:'Ejemplo',subtitle:'',image:'',status:'Cotizado',raw:{hotel_nombre:hotel}}))};
  toast=inject(TpToastService);
  name='';notes='';search='';count=2;selected:string|number|null=null;multiple:Array<string|number>=[];phone='';dialCode='52';time='17:10';range={start:'2026-10-09',end:'2026-10-13'};enabled=true;color='#137053';amount:string|null='1200.50';percent:number|null=10;
  action=signal('');formOpen=signal(false);loader=signal(false);private timer?:ReturnType<typeof setTimeout>;
  quoteControlsOpen=signal(false);
  statusOptions=QUOTE_STATUS_OPTIONS;
  quoteControls={status:'pendiente',insuranceDeadline:'',monthsDeadline:''};
  options=[{value:1,label:'Playas'},{value:2,label:'Ciudades coloniales'},{value:3,label:'Cabañas'},{value:4,label:'Promociones',disabled:true}];
  actions=[{id:'edit',label:'Editar',icon:'edit'},{id:'preview',label:'Vista previa',icon:'arrow'},{id:'delete',label:'Eliminar',icon:'trash',danger:true,disabled:true}];
  chart=[{label:'Cotizadas',value:8,color:'#137053'},{label:'Pendientes',value:3,color:'#d5a475'}];
  activity=[{label:'Lun',value:2},{label:'Mar',value:4},{label:'Mié',value:3},{label:'Jue',value:7},{label:'Vie',value:5}];
  fields:FieldDefinition[]=[{key:'nombre',label:'Nombre',required:true},{key:'tipo',label:'Tipo de experiencia',type:'select',options:this.options,required:true},{key:'activo',label:'Activo',type:'checkbox'}];
  folders:FolderImageManagerFolder[]=[{id:'brand',name:'Identidad',images:[{id:'logo',name:'Trotapie',imageUrl:'/brand/trotapie.png',folderId:'brand',folderName:'Identidad'},{id:'iso',name:'Isotipo',imageUrl:'/brand/iso.png',folderId:'brand',folderName:'Identidad'}]},{id:'flags',name:'Banderas',images:[{id:'mx',name:'México',imageUrl:'/flags/MX.svg',folderId:'flags',folderName:'Banderas'}]}];
  selectedImage:string|number|null='logo';activeImages:Array<string|number>=['logo'];
  previewLoader(){this.loader.set(true);clearTimeout(this.timer);this.timer=setTimeout(()=>this.loader.set(false),1200);}
  showToast(){this.toast.show({title:'Operación completada',message:'Notificación de ejemplo. Tus datos no cambiaron.',variant:'success'});}
  createFolder(name:string){this.folders=[...this.folders,{id:'demo-'+Date.now(),name,images:[]}];}
  renameFolder(event:{folder:FolderImageManagerFolder;name:string}){this.folders=this.folders.map(folder=>folder.id===event.folder.id?{...folder,name:event.name}:folder);}
  toggleImage(event:{image:{id:string|number};checked:boolean}){this.activeImages=event.checked?[...this.activeImages,event.image.id]:this.activeImages.filter(id=>id!==event.image.id);}
  ngOnDestroy(){clearTimeout(this.timer);}
}
