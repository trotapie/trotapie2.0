import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import {DOCUMENT} from '@angular/common';
import type { EmpleadoFirma } from '../../../data/queries/cotizaciones.service';
import {Icon} from '../icon/icon';

@Component({
  selector: 'tp-adviser-banner, app-banner',
  standalone: true,
  imports: [Icon],
  templateUrl: './banner.html',
  styleUrl: './banner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BannerComponent {
  empleado = input<EmpleadoFirma | null>(null);
  // Copia exacta del GIF de Drive de la firma anterior; URL absoluta para compartir.
  readonly logoUrl=new URL('/brand/trotapie.gif',inject(DOCUMENT).baseURI).href;
  readonly socials=[
    {name:'Facebook',icon:'facebook',url:'https://facebook.com/trotapie'},
    {name:'X',icon:'x',url:'https://x.com/trotapie'},
    {name:'TikTok',icon:'tiktok',url:'https://www.tiktok.com/@trotapie'},
    {name:'YouTube',icon:'youtube',url:'https://youtube.com/@trotapie'}
  ];

  emailHref = computed(() => {
    const email = this.empleado()?.email?.trim();
    return email ? `mailto:${email}` : null;
  });

  whatsappHref = computed(() => {
    const telefono = this.empleado()?.telefono?.replace(/\D/g, '') ?? '';
    return telefono ? `https://wa.me/${telefono}` : null;
  });
}
