import {Component,input,computed} from '@angular/core';
@Component({selector:'tp-catalog-icon',templateUrl:'./catalog-icon.html',styleUrl:'./catalog-icon.scss'})
export class CatalogIcon {
 value=input('');
 source=computed(()=>{const value=this.value().trim();return /^<svg[\s>]/i.test(value)?'data:image/svg+xml,'+encodeURIComponent(value):value;});
 mask=computed(()=> 'url("'+this.source().replaceAll('"','%22')+'")');
}
