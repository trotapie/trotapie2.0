set local lock_timeout = '5s';

create table public.catalogo_pestanas_hotel (
  id bigint generated always as identity primary key,
  nombre text not null,
  icono text
);

create table public.hotel_detalle_secciones (
  id uuid primary key,
  hotel_id bigint not null references public.hoteles(id) on delete cascade,
  catalogo_pestana_id bigint not null references public.catalogo_pestanas_hotel(id),
  orden integer not null,
  icono text,
  visible boolean not null default true,
  unique (hotel_id, catalogo_pestana_id)
);

create index hotel_detalle_secciones_catalogo_idx
  on public.hotel_detalle_secciones (catalogo_pestana_id);

create table public.hotel_detalle_secciones_traducciones (
  seccion_id uuid not null references public.hotel_detalle_secciones(id) on delete cascade,
  idioma_id bigint not null references public.idiomas(id),
  titulo text,
  contenido_html text,
  bloques jsonb,
  primary key (seccion_id, idioma_id)
);

create index hotel_detalle_secciones_traducciones_idioma_idx
  on public.hotel_detalle_secciones_traducciones (idioma_id);

alter table public.catalogo_pestanas_hotel enable row level security;
revoke all on public.catalogo_pestanas_hotel from public, anon, authenticated;
grant select, insert, update, delete on public.catalogo_pestanas_hotel to authenticated, service_role;

create policy catalogo_pestanas_hotel_admin on public.catalogo_pestanas_hotel
  for all to authenticated
  using ((select public.es_administrador_actual()))
  with check ((select public.es_administrador_actual()));

alter table public.hotel_detalle_secciones enable row level security;
revoke all on public.hotel_detalle_secciones from public, anon, authenticated;
grant select, insert, update, delete on public.hotel_detalle_secciones to authenticated, service_role;

create policy hotel_detalle_secciones_admin on public.hotel_detalle_secciones
  for all to authenticated
  using ((select public.es_administrador_actual()))
  with check ((select public.es_administrador_actual()));

alter table public.hotel_detalle_secciones_traducciones enable row level security;
revoke all on public.hotel_detalle_secciones_traducciones from public, anon, authenticated;
grant select, insert, update, delete on public.hotel_detalle_secciones_traducciones to authenticated, service_role;

create policy hotel_detalle_secciones_traducciones_admin on public.hotel_detalle_secciones_traducciones
  for all to authenticated
  using ((select public.es_administrador_actual()))
  with check ((select public.es_administrador_actual()));

revoke all on sequence public.catalogo_pestanas_hotel_id_seq from public, anon, authenticated;
grant usage, select on sequence public.catalogo_pestanas_hotel_id_seq to authenticated, service_role;

create function public.guardar_hotel_detalle_secciones(p_hotel_id bigint, p_secciones jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  seccion jsonb;
  traduccion jsonb;
  v_seccion_id uuid;
  v_catalogo_id bigint;
  ids uuid[] := '{}'::uuid[];
  catalogos bigint[] := '{}'::bigint[];
begin
  if not (select public.es_administrador_actual()) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if jsonb_typeof(p_secciones) is distinct from 'array' then
    raise exception 'Secciones inválidas' using errcode = '22023';
  end if;

  -- Serializar el guardado de las secciones de un mismo hotel.
  perform id from public.hoteles where id = p_hotel_id for no key update;
  if not found then
    raise exception 'No se encontró el hotel' using errcode = '23503';
  end if;

  -- Liberar las opciones de catálogo que el usuario descartó.
  delete from public.hotel_detalle_secciones existente
  where existente.hotel_id = p_hotel_id
    and not exists (
      select 1 from jsonb_array_elements(p_secciones) item
      where (item->>'id')::uuid = existente.id
    );

  for seccion in select value from jsonb_array_elements(p_secciones) loop
    v_seccion_id := (seccion->>'id')::uuid;
    v_catalogo_id := (seccion->>'catalogo_pestana_id')::bigint;
    if v_seccion_id = any(ids) or v_catalogo_id = any(catalogos) then
      raise exception 'Pestaña duplicada en el hotel' using errcode = '23505';
    end if;
    ids := array_append(ids, v_seccion_id);
    catalogos := array_append(catalogos, v_catalogo_id);

    insert into public.hotel_detalle_secciones as existente
      (id, hotel_id, catalogo_pestana_id, orden, icono, visible)
    select v_seccion_id, p_hotel_id, v_catalogo_id, (seccion->>'orden')::integer, c.icono,
      (seccion->>'visible')::boolean
    from public.catalogo_pestanas_hotel c
    where c.id = v_catalogo_id
    on conflict (id) do update set
      catalogo_pestana_id = excluded.catalogo_pestana_id,
      orden = excluded.orden,
      icono = excluded.icono,
      visible = excluded.visible
    where existente.hotel_id = excluded.hotel_id;

    if not found then
      raise exception 'La pestaña no existe en el catálogo o la sección pertenece a otro hotel'
        using errcode = '23503';
    end if;

    for traduccion in select value from jsonb_array_elements(seccion->'traducciones') loop
      insert into public.hotel_detalle_secciones_traducciones
        (seccion_id, idioma_id, titulo, contenido_html, bloques)
      values (v_seccion_id, (traduccion->>'idioma_id')::bigint, traduccion->>'titulo',
        traduccion->>'contenido_html', traduccion->'bloques')
      on conflict (seccion_id, idioma_id) do update set
        titulo = excluded.titulo,
        contenido_html = excluded.contenido_html,
        bloques = excluded.bloques;
    end loop;
  end loop;
end;
$$;

revoke execute on function public.guardar_hotel_detalle_secciones(bigint, jsonb) from public, anon;
grant execute on function public.guardar_hotel_detalle_secciones(bigint, jsonb) to authenticated;

notify pgrst, 'reload schema';
