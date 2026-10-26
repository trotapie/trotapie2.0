import {CompositionScaleDirective} from '../../directives/composition-scale.directive';
import {TpInputComponent} from '../tp-input/tp-input.component';
import {TpTextareaComponent} from '../tp-textarea/tp-textarea.component';
import {ColorPickerComponent} from '../color-picker/color-picker.component';
import {CustomSwitchComponent} from '../custom-switch/custom-switch.component';
import {Component,input,output,signal,effect} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {NgStyle} from '@angular/common';
import {Button} from '../button/button';
import {LanguageMenu} from '../language-menu/language-menu';
import {ImageTextPanelComponent} from '../image-text-panel/image-text-panel.component';
import {normalizarEstiloTextosImagen,PRESENTACION_TEXTO_PREDETERMINADA} from '../../models/image-text-style';
const defaults:Record<string,any>={texto_color:'#FFFFFF',titulo_font_size:48,descripcion_font_size:18,overlay_color:'#0F172A',overlay_opacidad:0,blur_px:0,efecto_destino:'fondo',oscurecer_fondo:false,etiqueta_texto:'',etiqueta_color:'#F9B44B',etiqueta_font_size:12,overlay_posicion:'bottom-left',contenido_posicion:'bottom-left',contenido_x:null,contenido_y:null};
@Component({selector:'tp-image-composer',imports:[CompositionScaleDirective,TpInputComponent,TpTextareaComponent,ColorPickerComponent,CustomSwitchComponent,FormsModule,NgStyle,Button,LanguageMenu,ImageTextPanelComponent],templateUrl:'./image-composer.html',styleUrl:'./image-composer.scss',host:{'[class.contained-editor]':'contained()'}})
export class ImageComposer {
 contained=input(false);
 previewOnly=input(false);
 image=input<Record<string,any>>({});title=input('Tu próximo viaje');description=input('Una experiencia para recordar.');languages=input<{id:number;codigo:string}[]>([]);language=input(1);translating=input(false);translationRequested=output<Record<string,any>>();changed=output<Record<string,any>>();value=signal<Record<string,any>>({});tab=signal('content');target=signal('titulo');device=signal('desktop');languageId=signal(1);private dragging:string|null=null;
 positions=['top-left','top-center','top-right','center-left','center','center-right','bottom-left','bottom-center','bottom-right'];
 positionLabels=['Arriba izquierda','Arriba centro','Arriba derecha','Centro izquierda','Centro','Centro derecha','Abajo izquierda','Abajo centro','Abajo derecha'];
 constructor(){effect(()=>{const raw=structuredClone(this.image());this.value.set({...defaults,...raw,...normalizarEstiloTextosImagen(raw)});});effect(()=>this.languageId.set(this.language()));}
 selectTab(tab:string){this.tab.set(tab);if(tab==='position'&&this.target()==='imagen')this.target.set('titulo');if(tab==='effects'&&this.target()==='etiqueta')this.target.set('imagen');}
 resetEffects(){if(this.target()==='imagen'){for(const key of ['overlay_color','overlay_opacidad','blur_px','efecto_destino','oscurecer_fondo'])this.reset(key);}else this.reset(this.target()+'_presentacion');}
 set(key:string,value:any){if(key.endsWith('_x')||key.endsWith('_y'))value=value===null?null:Math.min(100,Math.max(0,Number(value)||0));this.value.update(v=>({...v,[key]:value}));this.changed.emit(this.value());}
 text(){return this.value()['traducciones']?.[this.languageId()]||{};}
 changeText(key:string,text:string){const translations=structuredClone(this.value()['traducciones']||{});translations[this.languageId()]={...translations[this.languageId()],[key]:text};this.set('traducciones',translations);}
 changeLanguage(code:string){this.languageId.set(this.languages().find(l=>l.codigo===code)?.id||this.language());}
 languageCode(){return this.languages().find(l=>l.id===this.languageId())?.codigo||'es';}
 codes(){return this.languages().map(l=>l.codigo);}
 previewText(key:string){return this.text()[key]??(key==='nombre'?this.title():this.description());}
 prefix(){return this.target()==='etiqueta'?'overlay':this.target();}
 presentation(){return this.target()==='imagen'?this.value():this.value()[this.target()+'_presentacion'];}
 setPresentation(key:string,value:any){if(this.target()==='imagen')this.set(key,value);else this.set(this.target()+'_presentacion',{...this.presentation(),[key]:value});}
 reset(key:string){if(key.endsWith('_presentacion'))this.set(key,{...PRESENTACION_TEXTO_PREDETERMINADA});else this.set(key,defaults[key]??(key.endsWith('_color')?'#FFFFFF':null));}
 resetAll(){const v=this.value();this.value.set({...v,...defaults,...normalizarEstiloTextosImagen(defaults)});this.changed.emit(this.value());}
 positionStyle(prefix:string,fallback:string){const v=this.value(),position=v[prefix+'_posicion']||fallback;let x=8,y=82;if(position==='custom'){x=Number(v[prefix+'_x']??50);y=Number(v[prefix+'_y']??50);}else{const i=this.positions.indexOf(position);x=[8,50,92][Math.max(0,i)%3];y=[8,50,92][Math.floor(Math.max(0,i)/3)];}return {left:x+'%',top:y+'%',transform:`translate(${x>66?'-100%':x>33?'-50%':'0'},${y>66?'-100%':y>33?'-50%':'0'})`,textAlign:x>66?'right':x>33?'center':'left'};}
 start(event:PointerEvent,prefix:string){if(this.previewOnly()||event.button!==0)return;this.dragging=prefix;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);event.preventDefault();event.stopPropagation();}
 drag(event:PointerEvent){if(!this.dragging)return;const stage=(event.currentTarget as HTMLElement).closest('.composer-stage')!;const r=stage.getBoundingClientRect();const prefix=this.dragging;const clamp=(n:number)=>Math.round(Math.min(100,Math.max(0,n))*100)/100;this.value.update(v=>({...v,[prefix+'_posicion']:'custom',[prefix+'_x']:clamp((event.clientX-r.left)/r.width*100),[prefix+'_y']:clamp((event.clientY-r.top)/r.height*100)}));this.changed.emit(this.value());}
 end(){this.dragging=null;}
}
