import { Component, inject, input } from '@angular/core';
import { ThemeService } from '../../../core/services/theme.service';
import { Button } from '../button/button';
import { gsap } from 'gsap';

@Component({
  selector: 'tp-theme-toggle',
  // imports: [Button],
  templateUrl: './theme-toggle.html',
  styleUrl: './theme-toggle.scss',
})
export class ThemeToggle {
  theme = inject(ThemeService);
  english = input(false);

  toggle(event: MouseEvent) {
    const btn = event.currentTarget as HTMLElement;
    const icon = btn?.querySelector('tp-icon, svg');
    if (icon) {
      gsap.fromTo(
        icon,
        { rotation: -90, scale: 0.7 },
        { rotation: 0, scale: 1, duration: 0.45, ease: 'back.out(1.7)' }
      );
    }
    this.theme.toggle(event);
  }

  label() {
    return this.theme.dark()
      ? (this.english() ? 'Use light mode' : 'Activar modo claro')
      : (this.english() ? 'Use dark mode' : 'Activar modo oscuro');
  }
}
