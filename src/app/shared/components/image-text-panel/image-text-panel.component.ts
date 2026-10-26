import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { PRESENTACION_TEXTO_PREDETERMINADA, PresentacionTextoImagen } from '../../models/image-text-style';

/** A separate backdrop for each image text, shared by the editor and public carousel. */
@Component({
  selector: 'app-image-text-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl:'./image-text-panel.component.html',
  styleUrl:'./image-text-panel.component.scss'
})
export class ImageTextPanelComponent {
  @Input() presentacion: PresentacionTextoImagen = PRESENTACION_TEXTO_PREDETERMINADA;

  get colorFondo(): string {
    if (!this.presentacion.efecto_activo) return 'rgb(255 255 255 / 12%)';
    const hex = this.presentacion.overlay_color.slice(1);
    return `rgba(${parseInt(hex.slice(0, 2), 16)}, ${parseInt(hex.slice(2, 4), 16)}, ${parseInt(hex.slice(4, 6), 16)}, ${this.presentacion.overlay_opacidad})`;
  }

  get filtroFondo(): string {
    const blur = this.presentacion.efecto_activo ? this.presentacion.blur_px : 12;
    return `blur(${blur}px)${this.presentacion.oscurecer_fondo ? ' saturate(1.5)' : ''}`;
  }
}


