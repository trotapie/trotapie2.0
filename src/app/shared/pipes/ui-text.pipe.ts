import {inject, Pipe, PipeTransform} from '@angular/core';
import {LanguageService} from '../../core/services/language.service';

/** Impure so a language change also updates otherwise unchanged labels. */
@Pipe({name:'uiText', pure:false})
export class UiTextPipe implements PipeTransform {
  private readonly language = inject(LanguageService);
  transform(value: string | null | undefined): string {
    return this.language.translateText(value ?? '');
  }
}
