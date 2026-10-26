import {Directive,ElementRef,DestroyRef,inject,output,afterNextRender} from '@angular/core';
@Directive({selector:'[tpGridColumns]'})
export class GridColumnsDirective {
 columnsChanged=output<number>();
 constructor(){const element=inject(ElementRef<HTMLElement>).nativeElement,destroy=inject(DestroyRef);afterNextRender(()=>{let previous=0;const update=()=>{const columns=getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length;const pageSize=columns<=2?10:columns*2;if(pageSize!==previous){previous=pageSize;this.columnsChanged.emit(pageSize);}};const observer=new ResizeObserver(update);observer.observe(element);update();destroy.onDestroy(()=>observer.disconnect());});}
}
