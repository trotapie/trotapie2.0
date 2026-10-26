import {Component,input,output,signal,computed,ElementRef,viewChild,effect,afterRenderEffect} from '@angular/core';
import {RouterLink} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {Dialog} from '../dialog/dialog';
import {Icon} from '../icon/icon';
import {NavigationEntry} from '../../models/navigation-entry';

function normalize(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();}
@Component({selector:'tp-navigation-search',imports:[Dialog,Icon,FormsModule,RouterLink],templateUrl:'./navigation-search.html',styleUrl:'./navigation-search.scss'})
export class NavigationSearch {
  open=input(false);
  entries=input<NavigationEntry[]>([]);
  closed=output<void>();
  query=signal('');
  active=signal(0);
  private searchInput=viewChild<ElementRef<HTMLInputElement>>('searchInput');
  private links=viewChild<ElementRef<HTMLElement>>('resultsElement');
  private static nextId=0;
  id=`navigation-search-${NavigationSearch.nextId++}`;
  results=computed(()=>{
    const words=normalize(this.query()).trim().split(/\s+/).filter(Boolean);
    return this.entries().filter(entry=>words.every(word=>normalize(`${entry.title} ${entry.description} ${entry.group} ${entry.keywords||''}`).includes(word)));
  });
  constructor(){
    effect(()=>{if(this.open()){this.query.set('');this.active.set(0);}});
    afterRenderEffect(()=>{if(this.open())queueMicrotask(()=>{if(this.open())this.searchInput()?.nativeElement.focus();});});
  }
  search(value:string){this.query.set(value);this.active.set(0);}
  keydown(event:KeyboardEvent){
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();this.closed.emit();return;}
    if(!['ArrowDown','ArrowUp','Enter'].includes(event.key))return;
    event.preventDefault();
    const total=this.results().length;if(!total)return;
    if(event.key==='Enter'){this.links()?.nativeElement.querySelector<HTMLAnchorElement>(`#${this.optionId(this.active())}`)?.click();return;}
    this.active.update(index=>(index+(event.key==='ArrowDown'?1:-1)+total)%total);
    queueMicrotask(()=>this.links()?.nativeElement.querySelector<HTMLElement>(`#${this.optionId(this.active())}`)?.scrollIntoView({block:'nearest'}));
  }
  optionId(index:number){return `${this.id}-option-${index}`;}
}
