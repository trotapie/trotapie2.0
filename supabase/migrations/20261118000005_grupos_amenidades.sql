create table public.grupos_amenidades (
  id bigint generated always as identity primary key,
  nombre text not null check (nombre = btrim(nombre) and nombre <> ''),
  activo boolean not null default true
);

create unique index grupos_amenidades_nombre_unico
  on public.grupos_amenidades (lower(nombre));

create table public.grupos_amenidades_actividades (
  grupo_id bigint not null references public.grupos_amenidades(id) on delete cascade,
  actividad_id bigint not null references public.actividades(id) on delete cascade,
  primary key (grupo_id, actividad_id)
);

create index grupos_amenidades_actividades_actividad_idx
  on public.grupos_amenidades_actividades (actividad_id);

alter table public.grupos_amenidades enable row level security;
alter table public.grupos_amenidades_actividades enable row level security;
revoke all on public.grupos_amenidades, public.grupos_amenidades_actividades from public, anon, authenticated;
grant select, insert, update, delete on public.grupos_amenidades to authenticated;
grant select, insert, delete on public.grupos_amenidades_actividades to authenticated;

create policy grupos_amenidades_lectura_hoteles on public.grupos_amenidades
  for select to authenticated
  using (activo and (select public.has_permission('hoteles.edit')));

create policy grupos_amenidades_gestion on public.grupos_amenidades
  for all to authenticated
  using ((select public.es_administrador_actual() or public.has_permission('destinos.edit')))
  with check ((select public.es_administrador_actual() or public.has_permission('destinos.edit')));

create policy grupos_amenidades_actividades_lectura on public.grupos_amenidades_actividades
  for select to authenticated
  using (exists (
    select 1 from public.grupos_amenidades as grupo where grupo.id = grupo_id
  ));

create policy grupos_amenidades_actividades_gestion on public.grupos_amenidades_actividades
  for all to authenticated
  using ((select public.es_administrador_actual() or public.has_permission('destinos.edit')))
  with check ((select public.es_administrador_actual() or public.has_permission('destinos.edit')));

-- This transaction edits the template only; hotels store their own activity IDs.
create function public.guardar_grupo_amenidades(
  p_id bigint, p_nombre text, p_activo boolean, p_actividad_ids bigint[]
) returns bigint language plpgsql security invoker set search_path = '' as $$
declare
  grupo_id_guardado bigint;
begin
  if p_nombre is null or btrim(p_nombre) = '' or coalesce(cardinality(p_actividad_ids), 0) = 0 then
    raise exception using errcode = '22023', message = 'Escribe un nombre y selecciona al menos una amenidad.';
  end if;

  if p_id is null then
    insert into public.grupos_amenidades (nombre, activo)
    values (btrim(p_nombre), p_activo)
    returning id into grupo_id_guardado;
  else
    update public.grupos_amenidades
    set nombre = btrim(p_nombre), activo = p_activo
    where id = p_id
    returning id into grupo_id_guardado;

    if not found then
      raise exception using errcode = '42501', message = 'No se pudo editar el grupo. Verifica tus permisos o si aún existe.';
    end if;

    delete from public.grupos_amenidades_actividades where grupo_id = grupo_id_guardado;
  end if;

  insert into public.grupos_amenidades_actividades (grupo_id, actividad_id)
  select distinct grupo_id_guardado, actividad_id
  from unnest(p_actividad_ids) as seleccion(actividad_id);

  return grupo_id_guardado;
end;
$$;

revoke all on function public.guardar_grupo_amenidades(bigint, text, boolean, bigint[]) from public, anon, authenticated;
grant execute on function public.guardar_grupo_amenidades(bigint, text, boolean, bigint[]) to authenticated;
