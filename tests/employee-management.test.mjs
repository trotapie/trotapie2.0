import test from 'node:test';
import assert from 'node:assert/strict';
import {employeeActions,employeeAccessLabel,filterEmployees,isProtectedEmployee,employeeContactEmail} from '../src/app/features/employees/models/employee-management.ts';

test('contact email normalizes saved values and supports clearing optional email',()=>{
  assert.equal(employeeContactEmail(' Alex@Trotapie.com '),'alex@trotapie.com');
  assert.equal(employeeContactEmail('  '),null);
  assert.equal(employeeContactEmail(null),null);
  for(const value of ['not-an-email','alex@','a b@trotapie.com','a'.repeat(181)+'@trotapie.com'])assert.throws(()=>employeeContactEmail(value),/correo válido/);
});

test('restores employee actions without publishing permission management',()=>{
  const actions=employeeActions({nombre:'Alex',auth_user_id:'user',estatus_clave:'activo'},true);
  assert.deepEqual(actions.map(action=>action.id),['signature','edit','remove-access','delete-employee','employee-status']);
  assert.equal(actions.at(-1).label,'Inhabilitar empleado');
  assert.equal(employeeActions({estatus_clave:'inactivo'},true).at(-1).label,'Habilitar empleado');
});

test('protects Otro and disables removal of access when no user exists',()=>{
  assert.equal(isProtectedEmployee({nombre:' OTRO '}),true);
  const actions=employeeActions({nombre:'Otro',auth_user_id:'user'},true);
  for(const id of ['remove-access','delete-employee','employee-status'])assert.equal(actions.find(action=>action.id===id).disabled,true);
  assert.equal(employeeActions({nombre:'Alex'},true).find(action=>action.id==='remove-access').disabled,true);
});

test('read-only users and pending operations cannot mutate employee records',()=>{
  for(const actions of [employeeActions({},false),employeeActions({},true,true)]){
    assert.equal(actions[0].disabled,undefined);
    assert.ok(actions.slice(1).every(action=>action.disabled));
  }
});

test('access labels preserve first-login, active and unassigned states',()=>{
  assert.equal(employeeAccessLabel({primera_vez_login:true,auth_user_id:'user'}),'Primer ingreso');
  assert.equal(employeeAccessLabel({auth_user_id:'user'}),'Activo');
  assert.equal(employeeAccessLabel({}),'Sin usuario');
});

test('employee filters combine before pagination and include email search',()=>{
  const rows=[{nombre:'Alex',email:'alex@trotapie.com',cargo_id:2,estatus_id:7,auth_user_id:'u'},
    {nombre:'Otro',email:null,estatus_id:null},
    {nombre:'Ana',email:'ana@trotapie.com',cargo_id:2,estatus_id:7,primera_vez_login:true}];
  assert.deepEqual(filterEmployees(rows,'TROTAPIE',{cargo:2,status:'7',access:'Activo'}),[rows[0]]);
  assert.deepEqual(filterEmployees(rows,'',{email:' ANA@',access:'Primer ingreso'}),[rows[2]]);
  assert.equal(filterEmployees(rows,'',{}).length,3);
});
