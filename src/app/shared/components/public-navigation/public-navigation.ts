import {afterRenderEffect, Component, ElementRef, input, output, signal, viewChild} from '@angular/core';
import {CdkTrapFocus} from '@angular/cdk/a11y';
import {RouterLink} from '@angular/router';
import {gsap} from 'gsap';
import {Icon} from '../icon/icon';
import {LanguageMenu} from '../language-menu/language-menu';
import {ThemeToggle} from '../theme-toggle/theme-toggle';
import {NavIndicatorDirective} from '../../directives/nav-indicator.directive';

@Component({
  selector: 'tp-public-navigation',
  imports: [CdkTrapFocus, RouterLink, Icon, LanguageMenu, ThemeToggle, NavIndicatorDirective],
  templateUrl: './public-navigation.html',
  styleUrls: ['./public-navigation.scss', './public-menu.scss'],
  host: {'(window:resize)': 'onResize()'},
})
export class PublicNavigation {
  english = input(false);
  activeSection = input('');
  homeSelected = output<MouseEvent>();
  destinationsSelected = output<MouseEvent>();
  languageChanged = output<void>();
  menuChanged = output<boolean>();
  mobileMenuOpen = signal(false);
  private mobileMenu = viewChild<ElementRef<HTMLElement>>('mobileMenu');

  constructor() {
    afterRenderEffect((onCleanup) => {
      const menu = this.mobileMenu()?.nativeElement;
      if (!menu) return;
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.timeline({defaults: {ease: 'power3.out'}})
          .from(menu.querySelector('.mobile-menu-heading'), {autoAlpha: 0, x: 20, duration: 0.3}, 0.12)
          .from(menu.querySelectorAll('nav a'), {autoAlpha: 0, x: 32, duration: 0.42, stagger: 0.075}, 0.18);
      }, menu);
      onCleanup(() => media.revert());
    });
  }

  text(es: string, en: string) { return this.english() ? en : es; }
  setMenu(open: boolean) {
    this.mobileMenuOpen.set(open);
    this.menuChanged.emit(open);
  }
  onResize() {
    if (this.mobileMenuOpen() && matchMedia('(min-width: 701px)').matches) this.setMenu(false);
  }
}
