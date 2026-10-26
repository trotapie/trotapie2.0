import {Injectable,inject} from '@angular/core';
import {AuthService} from './auth.service';
import {NavigationEntry} from '../../shared/models/navigation-entry';
import {catalogLabels,catalogOverviewKeys} from '../../features/catalogs/models/catalog-definitions';

export const workspaceNavigation=[{name:'Dashboard',path:'dashboard',icon:'grid',permission:''},{name:'Cotizaciones',path:'cotizaciones',icon:'quote',permission:'cotizaciones.view'},{name:'Destinos',path:'destinos',icon:'map',permission:'destinos.view'}];
export const workspaceMoreNavigation=[{name:'Clientes',path:'clientes',icon:'people',permission:'cotizaciones.view'},{name:'Empleados',path:'empleados',icon:'people',permission:'empleados.manage'},{name:'Circuitos',path:'circuitos',icon:'suitcase',permission:'circuitos.view'},{name:'Catálogos',path:'catalogos',icon:'grid',permission:'destinos.edit'},{name:'Imágenes del inicio',path:'imagenes-inicio',icon:'home',permission:'destinos.edit'},{name:'Configuración',path:'configuracion',icon:'settings',permission:'empleados.manage'}];

@Injectable({providedIn:'root'})
export class NavigationSearchService {
  private auth=inject(AuthService);
  entries(base:string,preview=false):NavigationEntry[]{
    const sections:NavigationEntry[]=[...workspaceNavigation,...workspaceMoreNavigation].map(item=>({title:item.name,path:`${base}/${item.path}`,icon:item.icon,permission:item.permission,group:'Secciones',description:item.name==='Dashboard'?'Resumen y estadísticas de tu agencia':`Abrir ${item.name.toLocaleLowerCase()}`,keywords:item.name==='Dashboard'?'inicio resumen estadisticas graficas':item.name==='Cotizaciones'?'solicitudes propuestas reservas':''}));
    const catalogs:NavigationEntry[]=catalogOverviewKeys.map(key=>({title:catalogLabels[key],path:`${base}/catalogos/${key}`,icon:'grid',permission:'destinos.edit',group:'Catálogos',description:`Catálogo de ${catalogLabels[key].toLocaleLowerCase()}`,keywords:key.replaceAll('_',' ')}));
    return [...sections,...catalogs].filter(item=>preview||!item.permission||this.auth.hasPermission(item.permission));
  }
}

