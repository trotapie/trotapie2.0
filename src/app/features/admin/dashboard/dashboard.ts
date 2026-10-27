import {Component,inject,signal,computed,OnInit} from '@angular/core';import {Router,RouterLink,ActivatedRoute} from '@angular/router';
import {DashboardStatistics} from './components/dashboard-statistics/dashboard-statistics';
import {DashboardSnapshot} from '../../../data/models/dashboard-statistics';
import {TravelDataService,TravelRecord,normalizeRecord} from '../../../data/facades/travel-data.service';import {AuthService} from '../../../core/services/auth.service';import {Button} from '../../../shared/components/button/button';import {Icon} from '../../../shared/components/icon/icon';import {DataTable} from '../../../shared/components/data-table/data-table';import {ImageCard} from '../../../shared/components/image-card/image-card';import {State} from '../../../shared/components/state/state';
@Component({selector:'tp-dashboard',imports:[DashboardStatistics,RouterLink,Button,Icon,DataTable,ImageCard,State],templateUrl:'./dashboard.html',styleUrl:'./dashboard.scss'})
export class Dashboard implements OnInit {
  data=inject(TravelDataService);auth=inject(AuthService);router=inject(Router);route=inject(ActivatedRoute);preview=!!this.route.snapshot.data['preview'];base=this.preview?'/vista-previa':'/admin';
  loading=signal(true);error=signal('');cover=signal<any>(null);destinations=signal<TravelRecord[]>([]);snapshot=signal<DashboardSnapshot>({total:null,pending:null,quoted:null,recent:[]});
  ratio=computed(()=>this.snapshot().total ? Math.round((this.snapshot().quoted||0)/this.snapshot().total!*100) : 0);
  ngOnInit(){void this.load();}
  async load(){this.loading.set(true);this.error.set('');try{
    const photos=Promise.allSettled([this.data.coverImages(),this.data.publicDestinations()]);
    if(!this.preview)this.snapshot.set(await this.data.dashboard());
    const [covers,destinations]=await photos;
    if(covers.status==='fulfilled'){const images=covers.value.filter((image:any)=>!!image.url_imagen?.trim());this.cover.set(images.length?images[Math.floor(Math.random()*images.length)]:null);this.destinations.set(images.slice(0,3).map((r:any)=>({id:'cover-'+r.id,title:r.nombre_destino,subtitle:'Inspiración Trotapie',image:r.url_imagen,status:'',raw:{inspiration:true}})));}
    if(!this.destinations().length&&destinations.status==='fulfilled')this.destinations.set(destinations.value.items.filter(r=>r.image).slice(0,3));
  }catch(e){this.error.set('No pudimos consultar el resumen. Revisa tu conexión.');}finally{this.loading.set(false);}}
  openQuote(r:TravelRecord){void this.router.navigate([this.base,'cotizaciones'],{queryParams:{buscar:r.title}});}
  goDestination(r:TravelRecord){void this.router.navigate(r.raw['inspiration']?['/destinos']:['/destinos',r.id]);}
  value(n:number|null){return n===null?'—':new Intl.NumberFormat('es-MX').format(n);}
}
