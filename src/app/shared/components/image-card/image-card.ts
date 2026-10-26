import {CatalogIcon} from '../catalog-icon/catalog-icon';
import { Component, input, output, computed, linkedSignal } from '@angular/core';
import { Icon } from '../icon/icon';
import { Badge } from '../badge/badge';
import { MotionDirective } from '../../directives/motion.directive';
import type { TravelRecord } from '../../../data/facades/travel-data.service';
@Component({
  selector: 'tp-image-card',
  hostDirectives: [MotionDirective],
  imports: [CatalogIcon,Icon, Badge],
  templateUrl: './image-card.html',
  styleUrl: './image-card.scss',
})
export class ImageCard {
  record = input.required<TravelRecord>();
  label = input('Descubrir destino');
  imageFit = input<'cover' | 'contain'>('cover');
  private landscapePhoto=linkedSignal(()=>{this.record().image;return false;});
  containImage=computed(()=>this.imageFit()==='contain'&&!this.landscapePhoto()&&!/\.(?:jpe?g|avif)(?:[?#]|$)/i.test(this.record().image));
  imageLoaded(event:Event){const image=event.target as HTMLImageElement;this.landscapePhoto.set(image.naturalWidth/image.naturalHeight>1.35);}
  showStatus = input(true);
  country = input('');
  stars = input<number|string|null>(0);
  starCount=computed(()=>Math.min(5,Math.max(0,Number(this.stars())||0)));
  starIcons=computed(()=>Array.from({length:Math.ceil(this.starCount())},(_,i)=>({index:i,clip:Math.max(0,1-Math.min(1,this.starCount()-i))*100})));
  hasActions = input(false);
  selected = output<TravelRecord>();
  imageError(e: Event) {
    (e.target as HTMLImageElement).src = '/brand/iso.png';
  }
}
