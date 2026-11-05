import type {TpActionMenuItem} from '../../../shared/components/tp-actions-menu/tp-actions-menu.component';

type Employee = Record<string, any>;
export function employeeContactEmail(value:unknown):string|null {
  const email=String(value??'').trim().toLowerCase();
  if(!email)return null;
  if(email.length>180||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Captura un correo válido de hasta 180 caracteres.');
  return email;
}
export function isProtectedEmployee(employee:Employee):boolean {
  return String(employee['nombre']??'').trim().toLocaleLowerCase()==='otro';
}
export function employeeAccessLabel(employee:Employee):string {
  return employee['primera_vez_login']?'Primer ingreso':employee['auth_user_id']?'Activo':'Sin usuario';
}
export function employeeActions(employee:Employee,canManage:boolean,busy=false):TpActionMenuItem[] {
  const blocked=!canManage||busy;
  const protectedEmployee=isProtectedEmployee(employee);
  return [
    {id:'signature',label:'Ver firma',icon:'eye'},
    {id:'edit',label:'Editar empleado',icon:'edit',disabled:blocked},
    // Entrega posterior: gestión de acceso, roles y permisos.
    // {id:'access',label:'Gestionar acceso',icon:'lock',disabled:blocked},
    {id:'remove-access',label:'Quitar acceso',icon:'lock',danger:true,disabled:blocked||protectedEmployee||!employee['auth_user_id']},
    {id:'delete-employee',label:'Eliminar empleado',icon:'trash',danger:true,disabled:blocked||protectedEmployee},
    {id:'employee-status',label:employee['estatus_clave']==='activo'?'Inhabilitar empleado':'Habilitar empleado',icon:'check',disabled:blocked||protectedEmployee}
  ];
}
export function filterEmployees(employees:Employee[],search:string,filters:Employee):Employee[] {
  const normalize=(value:unknown)=>String(value??'').trim().toLocaleLowerCase();
  return employees.filter(employee=>(!search||normalize(employee['nombre']).includes(normalize(search))||normalize(employee['email']).includes(normalize(search)))
    &&(!filters['cargo']||String(employee['cargo_id'])===String(filters['cargo']))
    &&(!filters['email']||normalize(employee['email']).includes(normalize(filters['email'])))
    &&(!filters['status']||String(employee['estatus_id'])===String(filters['status']))
    &&(!filters['access']||employeeAccessLabel(employee)===filters['access']));
}
