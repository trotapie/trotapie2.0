import {Routes} from '@angular/router';import {authGuard} from './core/services/auth.service';
import {reusedRouteChangesGuard, unsavedChangesGuard} from './core/guards/unsaved-changes.guard';
const workspace=()=>import('./layout/workspace/workspace').then(m=>m.Workspace);
const publicPage=()=>import('./features/public/explore/public').then(m=>m.PublicPage);
const dashboard=()=>import('./features/admin/dashboard/dashboard').then(m=>m.Dashboard);
const catalog=()=>import('./features/admin/catalog/catalog').then(m=>m.Catalog);
const catalogOverview=()=>import('./features/admin/catalog-overview/catalog-overview').then(m=>m.CatalogOverview);
const catalogRoutes=(preview=false):Routes=>[
 ...(preview?[{path:'componentes',loadComponent:()=>import('./features/common/shared-showcase/shared-showcase').then(m=>m.SharedShowcase),data:{preview:true}}]:[]),
 {path:'',pathMatch:'full',redirectTo:'dashboard'},
  {path:'dashboard',loadComponent:dashboard,data:{preview}},
  {path:'imagenes-inicio',loadComponent:()=>import('./features/admin/home-images/home-images').then(m=>m.HomeImages),data:{permission:'destinos.edit'},canActivate:[authGuard],canDeactivate:[unsavedChangesGuard]},
 {path:'empleados/:id/acceso',loadComponent:()=>import('./features/employees/access/employee-access').then(m=>m.EmployeeAccess),data:{permission:'empleados.manage'},canActivate:[authGuard]},
 {path:'circuitos/:id/flyer',loadComponent:()=>import('./features/circuits/flyer/flyer-editor').then(m=>m.FlyerEditor),data:{permission:'circuitos.edit'},canActivate:[authGuard]},
 {path:'roles/:id',loadComponent:()=>import('./features/configuration/role-editor/role-editor').then(m=>m.RoleEditor),data:{permission:'empleados.manage'},canActivate:[authGuard]},
 {path:'catalogos',loadComponent:catalogOverview,data:{preview},canActivate:preview?[]:[authGuard]},
 {path:'catalogos/:catalog',loadComponent:catalog,data:{kind:'catalogos',preview,permission:'destinos.edit'},canActivate:preview?[reusedRouteChangesGuard]:[authGuard,reusedRouteChangesGuard],canDeactivate:[unsavedChangesGuard]},
 {path:'destinos/:id/contenido',loadComponent:()=>import('./features/destinations/editor/destination-editor').then(m=>m.DestinationEditor),data:{permission:'destinos.edit'},canActivate:[authGuard],canDeactivate:[unsavedChangesGuard]},
 {path:'destinos/:destinationId/hoteles',loadComponent:catalog,data:{kind:'hoteles',preview,permission:'hoteles.view'},canActivate:preview?[]:[authGuard],canDeactivate:[unsavedChangesGuard]},
 {path:'cotizaciones/nueva',loadComponent:()=>import('./features/quotations/quote-editor/quote-editor').then(m=>m.QuoteEditor),data:{permission:'cotizaciones.create',preview},canActivate:preview?[]:[authGuard],canDeactivate:[unsavedChangesGuard]},
 {path:'cotizaciones/:id',loadComponent:()=>import('./features/quotations/quote-detail/quote-detail').then(m=>m.QuoteDetail),data:{permission:'cotizaciones.view',preview},canActivate:preview?[]:[authGuard]},
 ...['cotizaciones','destinos','hoteles','atracciones','clientes','empleados','catalogos','circuitos','configuracion'].map(kind=>({path:kind,loadComponent:catalog,data:{kind,preview,permission:kind==='configuracion'||kind==='empleados'?'empleados.manage':kind==='clientes'?'cotizaciones.view':kind==='catalogos'?'destinos.edit':kind==='atracciones'?'destinos.view':kind+'.view'},canActivate:preview?[]:[authGuard],canDeactivate:kind==='circuitos'?[]:[unsavedChangesGuard]}))
];
export const routes:Routes=[
 {path:'',pathMatch:'full',loadComponent:publicPage,data:{mode:'home'}},
 {path:'inicio',redirectTo:'',pathMatch:'full'},
 {path:'destinos',loadComponent:publicPage,data:{mode:'destinos'}},
 {path:'destinos/:id',loadComponent:publicPage,data:{mode:'destino'}},
 {path:'hoteles',loadComponent:publicPage,data:{mode:'hoteles'}},
 {path:'hoteles/:id',loadComponent:publicPage,data:{mode:'hoteles'}},
 {path:'hotel/:id',loadComponent:publicPage,data:{mode:'hotel'}},
 {path:'circuitos',loadComponent:publicPage,data:{mode:'circuitos'}},
 {path:'solicitar/:hotelId',loadComponent:()=>import('./features/quotations/quote-editor/quote-editor').then(m=>m.QuoteEditor),data:{public:true},canDeactivate:[unsavedChangesGuard]},
 {path:'cotizacion/:id',loadComponent:()=>import('./features/quotations/quote-detail/quote-detail').then(m=>m.QuoteDetail),data:{public:true}},
 {path:'comparativa/:id',loadComponent:()=>import('./features/quotations/quote-detail/quote-detail').then(m=>m.QuoteDetail),data:{public:true,multiple:true}},
 {path:'share/comparativa/:id',loadComponent:()=>import('./features/quotations/quote-detail/quote-detail').then(m=>m.QuoteDetail),data:{public:true,multiple:true}},
 {path:'acceso',loadComponent:()=>import('./features/auth/login/login').then(m=>m.Login)},
 {path:'sign-in',redirectTo:'acceso',pathMatch:'full'},
 {path:'recuperar-acceso',loadComponent:()=>import('./features/auth/login/login').then(m=>m.Login),data:{mode:'reset'}},
 {path:'cambiar-password',loadComponent:()=>import('./features/auth/login/login').then(m=>m.Login),data:{mode:'password'}},
 {path:'admin',loadComponent:workspace,canActivate:[authGuard],canActivateChild:[authGuard],children:catalogRoutes()},
 {path:'vista-previa',loadComponent:workspace,data:{preview:true},children:catalogRoutes(true)},
 {path:'sin-acceso',loadComponent:()=>import('./features/common/message-page').then(m=>m.MessagePage),data:{title:'Este espacio requiere otro permiso',description:'Solicita acceso al administrador de tu agencia.'}},
 {path:'**',loadComponent:()=>import('./features/common/message-page').then(m=>m.MessagePage),data:{title:'Nos salimos del itinerario',description:'No encontramos esa página. Regresa para elegir tu próximo destino.'}}
];
