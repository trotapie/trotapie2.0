import {afterNextRender,DestroyRef,Directive,ElementRef,inject} from '@angular/core';
/** Measure the fixed controls so table headings stick below them in the page scroll. */
@Directive({selector:'[tpCatalogScroll]'})
export class CatalogScrollDirective {
 constructor(){const panel=inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;const destroy=inject(DestroyRef);afterNextRender(()=>{
  let frame=0;
  const height=(selector:string)=>{const node=panel.querySelector<HTMLElement>(selector);return node?node.offsetHeight+(parseFloat(getComputedStyle(node).marginBottom)||0):0;};
  const update=()=>{const toolbar=height('tp-filter-bar'),filters=height('tp-quote-column-filters');panel.style.setProperty('--catalog-toolbar-height',toolbar+'px');panel.style.setProperty('--catalog-header-offset',(toolbar+filters)+'px');};
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(update);};
  const observer=new ResizeObserver(schedule);observer.observe(panel);for(const selector of ['tp-filter-bar','tp-quote-column-filters']){const node=panel.querySelector(selector);if(node)observer.observe(node);}
  update();destroy.onDestroy(()=>{observer.disconnect();cancelAnimationFrame(frame);});
 });}
}
