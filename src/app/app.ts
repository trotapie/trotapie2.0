import {Component,inject} from '@angular/core';import {RouterOutlet} from '@angular/router';
import {DOCUMENT} from '@angular/common';
import {ScreenLoadingService} from './core/services/screen-loading.service';
import {RouteLoader} from './shared/components/route-loader/route-loader';
import {PageMotionDirective} from './shared/directives/page-motion.directive';
import {TpToastComponent} from './shared/components/tp-toast/tp-toast.component';
@Component({selector:'app-root',imports:[RouteLoader,RouterOutlet,PageMotionDirective,TpToastComponent],templateUrl: './app.html', styleUrl: './app.scss'})
export class App {
  readonly loading=inject(ScreenLoadingService);
  readonly isTestEnvironment=inject(DOCUMENT).location?.hostname==='trotapie-dev.vercel.app';
}
