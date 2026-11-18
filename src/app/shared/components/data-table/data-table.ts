import {CatalogIcon} from '../catalog-icon/catalog-icon';
import {computed,signal} from '@angular/core';
import {OverlayModule,ConnectedPosition} from '@angular/cdk/overlay';
import type {TableColumn} from '../../models/resource-definition';
import {Component,input,output} from '@angular/core';import {DatePipe} from '@angular/common';import {Badge} from '../badge/badge';import type {TravelRecord} from '../../../data/facades/travel-data.service';
import {TpActionsMenuComponent,TpActionMenuItem} from '../tp-actions-menu/tp-actions-menu.component';
import {UiTextPipe} from '../../pipes/ui-text.pipe';
import {SvgPathIcon} from '../svg-path-icon/svg-path-icon';
import {parseSvgPathIcon} from '../../utils/svg-path-icon';
@Component({selector:'tp-data-table',imports:[UiTextPipe,OverlayModule,CatalogIcon,Badge,TpActionsMenuComponent,DatePipe,SvgPathIcon],templateUrl: './data-table.html', styleUrl: './data-table.scss'})
export class DataTable {stickyHeader=input(false);records=input<TravelRecord[]>([]);title=input('Nombre');columns=input<TableColumn[]>([]);actionable=input(true);actions=input<(record:TravelRecord)=>TpActionMenuItem[]>(()=>[{id:'open',label:'Consultar registro',icon:'arrow'}]);selected=output<TravelRecord>();actionSelected=output<{id:string;record:TravelRecord}>();act(id:string,record:TravelRecord){this.actionSelected.emit({id,record});if(id==='open')this.selected.emit(record);}imageError(e:Event){(e.target as HTMLImageElement).src='/brand/iso.png';}
  private static nextId=0;
  private detailsPrefix=`table-details-${DataTable.nextId++}`;
  detailsOpen=signal<string|null>(null);
  readonly hasTruncatedColumn=computed(()=>this.columns().some(column=>column.truncate));
  readonly svgIcons=computed(()=>new Map(this.records().filter(record=>record.raw['icono_svg'])
    .map(record=>[record.id,parseSvgPathIcon(record.raw['icono_svg'])] as const)));
  detailsPositions:ConnectedPosition[]=[{originX:'end',originY:'bottom',overlayX:'end',overlayY:'top',offsetY:8},{originX:'end',originY:'top',overlayX:'end',overlayY:'bottom',offsetY:-8}];
  detailsId(record:TravelRecord,column:TableColumn){return `${this.detailsPrefix}-${record.id}-${column.key}`;}
  details(record:TravelRecord,column:TableColumn):string[]{const value=column.detailsKey?record.raw[column.detailsKey]:null;return Array.isArray(value)?value:[];}
}
