import {Component,inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {PageHeader} from '../../../shared/components/page-header/page-header';
import {Icon} from '../../../shared/components/icon/icon';
import {MotionDirective} from '../../../shared/directives/motion.directive';
import {catalogLabels,catalogOverviewKeys} from '../../catalogs/models/catalog-definitions';

type CatalogCard={key:string;title:string;description:string;icon:string;accent:string};
const copy:Record<string,string>={
 amenidades:'Gestiona el catálogo general de amenidades disponibles.',atracciones:'Administra atracciones principales por destino.',codigos_pais:'Configura códigos telefónicos y su prioridad en cotizaciones.',conceptos:'Administra los conceptos usados en hoteles y cotizaciones.',descuentos:'Administra los tipos de descuento que usa el sistema.',estatus_cotizacion:'Administra estados del flujo comercial de cotizaciones.',estatus_empleado:'Gestiona estados de empleados para habilitar perfiles.',idiomas:'Gestiona idiomas habilitados para contenido y traducciones.',meses_disponibles:'Configura los plazos disponibles para las cotizaciones.',origen_reservacion:'Gestiona la clave y el nombre del origen comercial.',politicas:'Administra políticas usadas en reservas y tarifas.',roles_empresa:'Gestiona roles internos y su descripción en la empresa.',regimen_hotel:'Gestiona regímenes disponibles para hoteles.',tarifas:'Configura catálogos de tarifas aplicables en cotizaciones.',tipo_imagen:'Administra tipos de imagen para galerías y contenido.',tipos_habitacion:'Gestiona tipos de habitación disponibles por hotel.',tipos_turisticos:'Gestiona las categorías internas para clasificar destinos.',tratamientos:'Gestiona tratamientos como Sr., Sra., Lic. o Dr.'
};
const icons=['hotel','star','pin','quote','chart','check','people','globe','calendar','link','settings','people','hotel','quote','grid','hotel','map','people'];
@Component({selector:'tp-catalog-overview',imports:[PageHeader,Icon,RouterLink,MotionDirective],templateUrl:'./catalog-overview.html',styleUrl:'./catalog-overview.scss'})
export class CatalogOverview {
 cards:CatalogCard[]=catalogOverviewKeys.map((key,index)=>({key,title:catalogLabels[key],description:copy[key],icon:icons[index]||'grid',accent:`accent-${(index%6)+1}`}));
}
