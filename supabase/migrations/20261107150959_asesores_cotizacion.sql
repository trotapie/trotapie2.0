set local lock_timeout = '5s';

alter table public.empleados
  add column if not exists mostrar_en_cotizaciones boolean not null default false;

comment on column public.empleados.mostrar_en_cotizaciones is
  'Permite seleccionar al empleado activo como asesor en cotizaciones públicas e internas.';

-- La liberación conserva como seleccionables a los empleados activos actuales.
update public.empleados e
set mostrar_en_cotizaciones = true
from public.estatus_empleado s
where s.id = e.estatus_id
  and lower(trim(s.clave)) = 'activo'
  and s.activo is true
  and e.mostrar_en_cotizaciones is false;

alter policy "Permitir insertar empleados autenticados" on public.empleados
  to authenticated
  with check ((select public.es_administrador_actual() or public.has_permission('empleados.manage')));

alter policy "Permitir actualizar empleados autenticados" on public.empleados
  to authenticated
  using ((select public.es_administrador_actual() or public.has_permission('empleados.manage')))
  with check ((select public.es_administrador_actual() or public.has_permission('empleados.manage')));

alter policy "Permitir borrar empleados autenticados" on public.empleados
  to authenticated
  using ((select public.es_administrador_actual() or public.has_permission('empleados.manage')));

alter policy "Crear estatus empleado" on public.estatus_empleado
  to authenticated
  with check ((select public.es_administrador_actual()));

alter policy "Editar estatus empleado" on public.estatus_empleado
  to authenticated
  using ((select public.es_administrador_actual()))
  with check ((select public.es_administrador_actual()));

alter policy "Eliminar estatus empleado" on public.estatus_empleado
  to authenticated
  using ((select public.es_administrador_actual()));

revoke truncate on public.empleados, public.estatus_empleado from public, anon, authenticated;

create or replace function public.obtener_asesores_cotizacion()
returns table (id bigint, nombre text)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id::bigint, e.nombre::text
  from public.empleados e
  join public.estatus_empleado s on s.id = e.estatus_id
  where e.mostrar_en_cotizaciones is true
    and lower(trim(s.clave)) = 'activo'
    and s.activo is true
  order by e.id;
$$;

revoke execute on function public.obtener_asesores_cotizacion() from public;
grant execute on function public.obtener_asesores_cotizacion() to anon, authenticated;

create function trotapie_private.validar_asesor_cotizacion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Una cotización existente puede conservar su asignación histórica.
  if tg_op = 'UPDATE' and new.empleado_id is not distinct from old.empleado_id then
    return new;
  end if;

  perform e.id
  from public.empleados e
  join public.estatus_empleado s on s.id = e.estatus_id
  where e.id = new.empleado_id
    and e.mostrar_en_cotizaciones is true
    and lower(trim(s.clave)) = 'activo'
    and s.activo is true
  for share of e, s;

  if not found then
    raise exception 'Selecciona un asesor activo y habilitado para cotizaciones.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke execute on function trotapie_private.validar_asesor_cotizacion()
  from public, anon, authenticated;

drop trigger if exists validar_asesor_cotizacion on public.solicitudes_cotizacion;
create trigger validar_asesor_cotizacion
before insert or update of empleado_id on public.solicitudes_cotizacion
for each row execute function trotapie_private.validar_asesor_cotizacion();

drop trigger if exists validar_asesor_cotizacion on public.cotizaciones_multiples;
create trigger validar_asesor_cotizacion
before insert or update of empleado_id on public.cotizaciones_multiples
for each row execute function trotapie_private.validar_asesor_cotizacion();

notify pgrst, 'reload schema';
