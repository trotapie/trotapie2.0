import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EmpleadoFirma } from '../../../data/queries/cotizaciones.service';

@Component({
  selector: 'tp-adviser-banner, app-banner',
  standalone: true,
  templateUrl: './banner.html',
  styleUrl: './banner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BannerComponent {
  empleado = input<EmpleadoFirma | null>(null);

  emailHref = computed(() => {
    const email = this.empleado()?.email?.trim();
    return email ? `mailto:${email}` : null;
  });

  whatsappHref = computed(() => {
    const telefono = this.empleado()?.telefono?.replace(/\D/g, '') ?? '';
    return telefono ? `https://wa.me/${telefono}` : null;
  });
}


