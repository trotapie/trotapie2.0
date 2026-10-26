import {DestroyRef,inject,Injectable,signal} from '@angular/core';
import {NavigationStart,NavigationEnd,NavigationCancel,NavigationError,Router} from '@angular/router';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

@Injectable({providedIn:'root'})
export class ScreenLoadingService {
  readonly visible=signal(false);
  private timer?:ReturnType<typeof setTimeout>;
  private navigationId:number|null=null;
  constructor(){
    const router=inject(Router),destroy=inject(DestroyRef);
    router.events.pipe(takeUntilDestroyed(destroy)).subscribe(event=>{
      if(event instanceof NavigationStart)this.start(event.id);
      else if(event instanceof NavigationEnd||event instanceof NavigationCancel||event instanceof NavigationError){if(event.id===this.navigationId)this.finish();}
    });
    const current=router.getCurrentNavigation();if(current)this.start(current.id);
    destroy.onDestroy(()=>this.finish());
  }
  private start(id:number){
    clearTimeout(this.timer);this.navigationId=id;
    // Fast navigation stays immediate; the loader only appears when there is a wait.
    this.timer=setTimeout(()=>this.visible.set(true),120);
  }
  private finish(){clearTimeout(this.timer);this.navigationId=null;this.visible.set(false);}
}
