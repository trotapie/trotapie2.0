import {bootstrapApplication} from '@angular/platform-browser';import {registerLocaleData} from '@angular/common';import es from '@angular/common/locales/es';import {App} from './app/app';import {appConfig} from './app/app.config';
registerLocaleData(es);try{document.documentElement.dataset['theme']=localStorage.getItem('trotapie-theme')||'light';}catch{}
bootstrapApplication(App,appConfig).catch(console.error);
