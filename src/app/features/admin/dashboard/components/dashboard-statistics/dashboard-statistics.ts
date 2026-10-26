import { Component, computed, input } from '@angular/core';
import { TravelRecord } from '../../../../../data/models/travel-record';
import { TpDonutChartComponent } from '../../../../../shared/components/charts/tp-donut-chart/tp-donut-chart.component';
import { TpBarChartComponent } from '../../../../../shared/components/charts/tp-bar-chart/tp-bar-chart.component';
import { MotionDirective } from '../../../../../shared/directives/motion.directive';

export interface DashboardSnapshot { total:number|null; pending:number|null; quoted:number|null; recent:TravelRecord[]; }

@Component({
  selector:'tp-dashboard-statistics',
  imports:[],
  templateUrl:'./dashboard-statistics.html',
  styleUrl:'./dashboard-statistics.scss'})
export class DashboardStatistics {
  snapshot=input.required<DashboardSnapshot>();
  distribution=computed(()=>{
    const {total,pending,quoted}=this.snapshot();
    if(total===null||pending===null||quoted===null)return [];
    const other=Math.max(0,total-pending-quoted);
    return [{label:'Cotizadas',value:quoted,color:'var(--brand)'},{label:'Pendientes',value:pending,color:'#dfa877'},...(other?[{label:'Otros estados',value:other,color:'#8a9e98'}]:[])];
  });
  hotels=computed(()=>{
    const counts=new Map<string,number>();
    for(const record of this.snapshot().recent){const hotel=String(record.raw['hotel_nombre']||record.raw['nombre_hotel']||'Sin hotel asignado');counts.set(hotel,(counts.get(hotel)||0)+1);}
    return [...counts].sort((a,b)=>b[1]-a[1]).map(([label,value])=>({label,value,color:'var(--brand)'}));
  });
  summary=computed(()=>this.distribution().map(item=>`${item.label}: ${item.value}`).join('. '));
  hotelBars=computed(()=>this.hotels().map((hotel,index)=>({...hotel,label:`Hotel ${index+1}`})));
}
