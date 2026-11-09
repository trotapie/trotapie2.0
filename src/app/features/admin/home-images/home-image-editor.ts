import {afterRenderEffect, Component, computed, input, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {PhotoCarousel} from '../../../shared/components/photo-carousel/photo-carousel';
import {Button} from '../../../shared/components/button/button';
import {TpInputComponent} from '../../../shared/components/tp-input/tp-input.component';
import {ColorPickerComponent} from '../../../shared/components/color-picker/color-picker.component';
import {CustomSwitchComponent} from '../../../shared/components/custom-switch/custom-switch.component';
import {HOME_IMAGE_STYLE, homeImagePanPosition, normalizeHomeImageStyle, type HomeImageStyle} from '../../../shared/models/home-image-style';

@Component({
  selector:'tp-home-image-editor',
  imports:[FormsModule,PhotoCarousel,Button,TpInputComponent,ColorPickerComponent,CustomSwitchComponent],
  templateUrl:'./home-image-editor.html',styleUrl:'./home-image-editor.scss',
})
export class HomeImageEditor {
  value = input.required<Record<string,any>>();
  busy = input(false);
  changed = output<Record<string,any>>();
  translationsRequested = output<void>();
  device = signal('desktop');
  previewMode = signal<'home'|'original'>('home');
  imageUrl = computed(() => String(this.value()['url_imagen'] || ''));
  imageSize = signal<{width:number;height:number}|null>(null);
  imageFailed = signal(false);
  tab = signal('content');
  style = computed(() => normalizeHomeImageStyle(this.value()['presentacion']));
  photos = computed(() => this.value()['url_imagen'] ? [{src:this.value()['url_imagen'],location:this.value()['nombre_destino']||'Nombre del destino',homeStyle:this.style()}] : []);
  private dragStart:{id:number;x:number;y:number;imageX:number;imageY:number}|null = null;
  constructor() {
    afterRenderEffect((onCleanup) => {
      const url = this.imageUrl();
      this.imageSize.set(null);
      this.imageFailed.set(false);
      if (!url) return;
      const image = new Image();
      image.onload = () => this.imageSize.set({width:image.naturalWidth,height:image.naturalHeight});
      image.onerror = () => this.imageFailed.set(true);
      image.src = url;
      onCleanup(() => { image.onload = null; image.onerror = null; });
    });
  }
  set(key:string,value:unknown) { if(!this.busy()) this.changed.emit({...this.value(),[key]:value}); }
  setStyle(key:keyof HomeImageStyle,value:unknown) {
    this.previewMode.set('home');
    this.set('presentacion',normalizeHomeImageStyle({...this.style(),[key]:value}));
  }
  resetFrame() { this.previewMode.set('home'); this.set('presentacion',{...this.style(),zoom:1,x:50,y:50}); }
  resetDesign() { this.previewMode.set('home'); this.set('presentacion',{...HOME_IMAGE_STYLE}); }
  start(event:PointerEvent) {
    if(this.busy() || event.button!==0 || !this.photos().length || (event.target as HTMLElement).closest('button')) return;
    this.dragStart={id:event.pointerId,x:event.clientX,y:event.clientY,imageX:this.style().x,imageY:this.style().y};
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    event.preventDefault();
  }
  drag(event:PointerEvent) {
    const start=this.dragStart;
    if(!start || this.busy() || start.id!==event.pointerId) return;
    const frame=event.currentTarget as HTMLElement;
    const rect=frame.getBoundingClientRect();
    const image=frame.querySelector<HTMLImageElement>('.carousel-photo');
    if(!image?.naturalWidth || !image.naturalHeight || !rect.width || !rect.height) return;
    const coverScale=Math.max(rect.width/image.naturalWidth,rect.height/image.naturalHeight);
    const style=this.style();
    this.set('presentacion',normalizeHomeImageStyle({...style,
      x:homeImagePanPosition(start.imageX,event.clientX-start.x,rect.width,image.naturalWidth*coverScale,style.zoom),
      y:homeImagePanPosition(start.imageY,event.clientY-start.y,rect.height,image.naturalHeight*coverScale,style.zoom),
    }));
  }
  end() { this.dragStart=null; }
}
