import {NavIndicatorDirective} from '../../shared/directives/nav-indicator.directive';
import {toSignal} from '@angular/core/rxjs-interop';
import {filter,map} from 'rxjs';
import {NavigationEnd} from '@angular/router';
import {Component,inject,signal,computed,HostListener} from '@angular/core';
import {Router,RouterLink,RouterLinkActive,RouterOutlet,ActivatedRoute} from '@angular/router';
import {NavigationSearch} from '../../shared/components/navigation-search/navigation-search';
import {NavigationSearchService,workspaceNavigation,workspaceMoreNavigation} from '../../core/services/navigation-search.service';
import {ThemeService} from '../../core/services/theme.service';
import {PageMotionDirective} from '../../shared/directives/page-motion.directive';
import {DetailsMotionDirective} from '../../shared/directives/details-motion.directive';
import {AuthService} from '../../core/services/auth.service';import {Icon} from '../../shared/components/icon/icon';import {Button} from '../../shared/components/button/button';
import {gsap} from 'gsap';
@Component({selector:'tp-workspace',imports:[NavIndicatorDirective,NavigationSearch,RouterLink,RouterLinkActive,RouterOutlet,Icon,Button,PageMotionDirective,DetailsMotionDirective],templateUrl:'./workspace.html',styleUrl:'./workspace.scss'})
export class Workspace {
  theme=inject(ThemeService);
  auth=inject(AuthService);router=inject(Router);route=inject(ActivatedRoute);
  preview=!!this.route.snapshot.data['preview'];
  searchOpen=signal(false);
  searchService=inject(NavigationSearchService);
  searchEntries=computed(()=>this.searchService.entries(this.base,this.preview));
  nav=workspaceNavigation;
  more=workspaceMoreNavigation;
  base=this.preview?'/vista-previa':'/admin';
  currentUrl=toSignal(this.router.events.pipe(filter((event):event is NavigationEnd=>event instanceof NavigationEnd),map(event=>event.urlAfterRedirects)),{initialValue:this.router.url});
  moreActive=computed(()=>this.more.some(item=>this.sectionActive(item.path)));
  sectionActive(path:string){const url=this.currentUrl().split(/[?#]/)[0],target=this.base+'/'+path;return url===target||url.startsWith(target+'/');}
  allowed(p:string){return this.preview||!p||this.auth.hasPermission(p);}
  openSearch(){this.searchOpen.set(true);document.querySelectorAll<HTMLDetailsElement>('.nav-more[open],.account-menu[open]').forEach(menu=>menu.removeAttribute('open'));}
  @HostListener('document:keydown',['$event']) searchShortcut(event:KeyboardEvent){if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();this.searchOpen()?this.searchOpen.set(false):this.openSearch();}}
  toggleTheme(event?: MouseEvent) {
    if (event?.currentTarget) {
      const icon = (event.currentTarget as HTMLElement).querySelector('tp-icon, svg');
      if (icon) {
        gsap.fromTo(
          icon,
          { rotation: -90, scale: 0.7 },
          { rotation: 0, scale: 1, duration: 0.45, ease: 'back.out(1.7)' }
        );
      }
    }
    this.theme.toggle(event);
  }
  async logout(){await this.auth.signOut();await this.router.navigate(['/acceso']);}
}

