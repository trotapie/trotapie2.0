import { Injectable } from '@angular/core';

export type MotionPreset = 'card' | 'menu' | 'dialog' | 'sheet';

@Injectable({providedIn:'root'})
export class MotionService {
  private engine?: typeof import('gsap')['gsap'];
  private loading?: Promise<typeof import('gsap')['gsap']>;
  private generations = new WeakMap<HTMLElement,number>();
  reduced(){return matchMedia('(prefers-reduced-motion: reduce)').matches;}

  private async ready(element:HTMLElement) {
    const generation=(this.generations.get(element)||0)+1;
    this.generations.set(element,generation);
    this.loading ||= import('gsap').then(module=>this.engine=module.gsap);
    const engine=await this.loading;
    if(!element.isConnected || this.generations.get(element)!==generation)return null;
    engine.killTweensOf(element);
    return engine;
  }

  async enter(element:HTMLElement,preset:MotionPreset='card') {
    if(this.reduced())return null;
    const gsap=await this.ready(element);
    if(!gsap)return null;
    const menu=preset==='menu';
    return gsap.fromTo(element,
      {opacity:0,y:preset==='sheet'?56:menu?-6:14,scale:preset==='dialog'?.98:1},
      {opacity:1,y:0,scale:1,duration:menu?.2:.36,ease:'power2.out',clearProps:'opacity,transform'});
  }

  async page(element:HTMLElement) {
    if(this.reduced())return null;
    const gsap=await this.ready(element);
    if(!gsap)return null;
    return gsap.fromTo(element,{opacity:.65,y:10},{opacity:1,y:0,duration:.32,ease:'power2.out',clearProps:'opacity,transform'});
  }

  async leaveDialog(element:HTMLElement,sheet:boolean,done:()=>void) {
    if(this.reduced()){done();return null;}
    const gsap=await this.ready(element);
    if(!gsap)return null;
    return gsap.to(element,{opacity:0,y:sheet?44:8,duration:.16,ease:'power2.in',onComplete:()=>{
      gsap.set(element,{clearProps:'opacity,transform'});
      done();
    }});
  }
  cancel(element:HTMLElement){
    this.generations.set(element,(this.generations.get(element)||0)+1);
    this.engine?.killTweensOf(element);
    this.engine?.set(element,{clearProps:'opacity,transform'});
  }
}
