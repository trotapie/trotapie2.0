import { Component, inject, input, signal } from '@angular/core';
import { ClientService } from '../../../core/services/client.service';
import { LanguageService } from '../../../core/services/language.service';
import { Dialog } from '../dialog/dialog';
import { Button } from '../button/button';

@Component({selector:'tp-public-footer',imports:[Dialog,Button],templateUrl:'./public-footer.html',styleUrl:'./public-footer.scss'})
export class PublicFooter {
  language = inject(LanguageService);
  english = input(false);
  text(es: string, en?: string) { return this.language.translateText(es, en); }
  readonly year=new Date().getFullYear();
  readonly privacyUrl=inject(ClientService).client.storage.from('Public-docs').getPublicUrl('aviso-privacidad.pdf').data.publicUrl;
  privacyOpen=signal(false);
  privacyLoading=signal(false);
  privacyAvailable=signal(false);
  async openPrivacy(){
    this.privacyOpen.set(true);
    this.privacyLoading.set(true);
    try{
      const response=await fetch(this.privacyUrl,{method:'HEAD',signal:AbortSignal.timeout(10000)});
      this.privacyAvailable.set(response.ok);
    }catch{this.privacyAvailable.set(false);}
    finally{this.privacyLoading.set(false);}
  }
  readonly socials=[
    {name:'X',url:'https://x.com/trotapie',icon:'x'},
    {name:'YouTube',url:'https://youtube.com/@trotapie',icon:'youtube'},
    {name:'Instagram',url:'https://instagram.com/trotapie',icon:'instagram'},
    {name:'Facebook',url:'https://facebook.com/trotapie',icon:'facebook'},
    {name:'TikTok',url:'https://www.tiktok.com/@trotapie',icon:'tiktok'},
  ];
}
