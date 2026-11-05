import {Component, computed, inject, input, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {DomSanitizer} from '@angular/platform-browser';
import {Button} from '../button/button';
import {Dialog} from '../dialog/dialog';
import {Field} from '../field/field';
import {LocationMapViewer} from '../location-map/viewer/location-map-viewer';
import {externalMapUrl, parseMapPoint} from '../../utils/location';

@Component({
  selector:'tp-location-editor',
  imports:[FormsModule,Button,Dialog,Field,LocationMapViewer],
  templateUrl:'./location-editor.html',
  styleUrl:'./location-editor.scss',
})
export class LocationEditor {
  value=input<string|null>('');
  name=input('Ubicación');
  disabled=input(false);
  changed=output<string>();
  editing=signal(false);
  draft=signal('');
  private sanitizer=inject(DomSanitizer);
  location=computed(()=>(this.value()||'').trim());
  point=computed(()=>parseMapPoint(this.location()));
  externalUrl=computed(()=>externalMapUrl(this.location()));
  addressMap=computed(()=>{
    const address=this.location();
    if(!address||this.point()||/^[a-z][a-z\d+.-]*:/i.test(address))return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl('https://www.google.com/maps?q='+encodeURIComponent(address)+'&output=embed');
  });
  open(){if(this.disabled())return;this.draft.set(this.location());this.editing.set(true);}
  accept(){if(this.disabled()||!this.draft().trim())return;this.changed.emit(this.draft().trim());this.editing.set(false);}
  remove(){if(!this.disabled())this.changed.emit('');}
}
