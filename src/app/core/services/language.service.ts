import { Injectable, signal } from '@angular/core';
import { getDefaultLang } from '../utils/lang.utils';
import { TRANSLOCO_BUNDLES, UI_TRANSLATIONS } from '../i18n/translations';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly language = signal(getDefaultLang());

  getActiveLang() {
    return this.language();
  }

  setActiveLang(code: string) {
    this.language.set(code);
    try {
      localStorage.setItem('trotapie-language', code);
    } catch {}
  }

  translate(key: string): string {
    const lang = this.language();
    const bundle = TRANSLOCO_BUNDLES[lang] || TRANSLOCO_BUNDLES['es'] || {};
    if (bundle[key]) return bundle[key];
    const esBundle = TRANSLOCO_BUNDLES['es'] || {};
    if (esBundle[key]) return esBundle[key];
    return key === 'sin-descripcion' ? 'Información próximamente' : key;
  }

  translateText(es: string, en?: string): string {
    const lang = this.language();
    if (lang === 'es') return es;
    if (lang === 'en' && en) return en;

    const uiEntry = UI_TRANSLATIONS[es];
    if (uiEntry && uiEntry[lang]) {
      return uiEntry[lang];
    }

    const esBundle = TRANSLOCO_BUNDLES['es'] || {};
    const targetBundle = TRANSLOCO_BUNDLES[lang] || {};
    for (const [key, val] of Object.entries(esBundle)) {
      if (val === es && targetBundle[key]) {
        return targetBundle[key];
      }
    }

    return en || es;
  }
}
