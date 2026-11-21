import {Component, input, output} from '@angular/core';
import {RouterLink} from '@angular/router';
import {LanguageMenu} from '../language-menu/language-menu';
import {ThemeToggle} from '../theme-toggle/theme-toggle';
import {NavIndicatorDirective} from '../../directives/nav-indicator.directive';

@Component({
  selector: 'tp-public-navigation',
  imports: [RouterLink, LanguageMenu, ThemeToggle, NavIndicatorDirective],
  templateUrl: './public-navigation.html',
  styleUrl: './public-navigation.scss',
})
export class PublicNavigation {
  english = input(false);
  activeSection = input('');
  homeSelected = output<MouseEvent>();
  destinationsSelected = output<MouseEvent>();
  languageChanged = output<void>();

  text(es: string, en: string) { return this.english() ? en : es; }
}
