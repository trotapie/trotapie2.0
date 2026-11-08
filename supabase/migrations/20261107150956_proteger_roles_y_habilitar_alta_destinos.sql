set local lock_timeout = '5s';

create schema if not exists trotapie_private;

create function trotapie_private.proteger_rol_de_perfil()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin')
    and not (select public.es_administrador_actual()) then
    raise exception 'No tienes permiso para cambiar el rol del perfil.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke execute on function trotapie_private.proteger_rol_de_perfil()
  from public, anon, authenticated;

create trigger proteger_rol_de_perfil
before update of role on public.profiles
for each row when (old.role is distinct from new.role)
execute function trotapie_private.proteger_rol_de_perfil();

-- El alta de Auth parte de un rol fijo. El flujo administrativo asigna el rol
-- solicitado después de crear la cuenta, con el cliente de servicio.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', new.email),
    'cotizador'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke truncate on public.profiles, public.catalogo_destinos from public, anon, authenticated;

grant insert (nombre, slug, orden, prioridad, division_area_id, tipo_turistico_id, imagen_destino, activo)
  on public.catalogo_destinos to authenticated;
grant usage, select on sequence public.catalogo_destinos_id_seq to authenticated;

drop policy if exists catalogo_destinos_insert_admin on public.catalogo_destinos;
create policy catalogo_destinos_insert_admin
  on public.catalogo_destinos for insert to authenticated
  with check ((select public.es_administrador_actual()));
