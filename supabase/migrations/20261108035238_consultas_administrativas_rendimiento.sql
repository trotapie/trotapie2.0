set local lock_timeout = '5s';

CREATE FUNCTION public.puede_leer_cotizaciones_rendimiento()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO pg_catalog, public
AS $function$
  select (select auth.uid()) is not null and (
    (select public.has_role('admin'::text)) or exists (
      select 1 from public.profiles p
      join public.roles r on r.key = p.role
      join public.role_permissions rp on rp.role_id = r.id
      join public.permissions permiso on permiso.id = rp.permission_id
      where p.id = (select auth.uid()) and permiso.key = 'cotizaciones.view'
    )
  );
$function$;

CREATE FUNCTION public.cotizaciones_individuales_lectura()
 RETURNS SETOF jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO pg_catalog, public
AS $function$
  select to_jsonb(r) || jsonb_build_object(
    'empleado_id', sc.empleado_id, 'habitaciones', sc.habitaciones,
    'created_at', sc.created_at,
    'fecha_creacion', coalesce(to_jsonb(r)->>'fecha_creacion', sc.created_at::text),
    'tipoFila', 'individual')
  from public.obtener_solicitudes_cotizacion() r
  join public.solicitudes_cotizacion sc on sc.id::text = to_jsonb(r)->>'id'
  where (select public.puede_leer_cotizaciones_rendimiento())
    and ((select public.has_role('admin'::text)) or (
      sc.empleado_id in (select e.id from public.empleados e where e.auth_user_id = (select auth.uid()))
      and lower(trim(coalesce(to_jsonb(r)->>'estatus_nombre', ''))) <> 'eliminado'
    ));
$function$;

CREATE FUNCTION public.cotizaciones_comparativas_lectura(p_id bigint DEFAULT NULL::bigint)
 RETURNS SETOF jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO pg_catalog, public
AS $function$
  select jsonb_build_object(
    'id', cm.id, 'public_id', cm.public_id, 'tipoFila', 'comparativa',
    'empleado_id', cm.empleado_id, 'empleado_nombre', coalesce(e.nombre, ''),
    'fecha_creacion', cm.created_at, 'created_at', coalesce(cm.updated_at, cm.created_at),
    'cliente_nombre', coalesce(nullif(trim(cm.nombre_persona), ''),
      case when nullif(trim(c.nombre_completo), '') is not null
        then trim(concat_ws(' ', nullif(trim(t.abreviacion), ''), trim(c.nombre_completo))) end, c.nombre, ''),
    'cliente_email', coalesce(c.email, cm.correo, ''),
    'cliente_telefono', coalesce(c.telefono::text, cm.telefono::text, ''),
    'habitaciones', cm.habitaciones, 'estatus_nombre', coalesce(cm.estatus_clave, 'pendiente'),
    'hotel_nombre', coalesce(a.hoteles, 'Sin alternativas'),
    'destino_nombre', coalesce(a.destinos, ''), 'tipo_destino', coalesce(a.tipos, ''),
    'solicitudes', coalesce(a.solicitudes, '[]'::jsonb))
  from public.cotizaciones_multiples cm
  left join public.clientes c on c.id = cm.cliente_id
  left join public.tratamientos t on t.id = c.tratamiento_id
  left join public.empleados e on e.id = cm.empleado_id
  left join lateral (
    select string_agg(x.hotel, ' · ' order by x.orden, x.id) as hoteles,
      string_agg(distinct x.destino, ' · ') as destinos,
      string_agg(distinct nullif(x.tipo, ''), ' / ' order by nullif(x.tipo, '') desc)
        filter (where lower(trim(x.estatus)) <> 'eliminado') as tipos,
      jsonb_agg(jsonb_build_object('id', x.id, 'public_id', x.public_id,
        'hotel_nombre', x.hotel, 'destino_nombre', x.destino, 'tipo_destino', x.tipo,
        'estatus_nombre', x.estatus, 'created_at', x.created_at)
        order by x.orden, x.id) as solicitudes
    from (
      select sc.id, sc.public_id, sc.created_at, cs.id as orden,
        coalesce(sc.cotizacion_multiple->>'hotel_nombre', ht.nombre_hotel, '') as hotel,
        coalesce(d.nombre, sc.cotizacion_multiple->>'destino_nombre', '') as destino,
        case when d.tipo_desino_id is null then '' when d.tipo_desino_id = 2 then 'INTERNACIONAL' else 'NACIONAL' end as tipo,
        coalesce(ec.nombre, ec.clave, 'pendiente') as estatus
      from public.cotizaciones_solicitudes cs
      join public.solicitudes_cotizacion sc on sc.id = cs.solicitud_cotizacion_id
      left join public.hoteles h on h.id = sc.hotel_id
      left join public.hotel_traducciones ht on ht.hotel_id = h.id and ht.idioma_id = 1
      left join public.destinos d on d.id = h.destino_id
      left join public.estatus_cotizacion ec on ec.id = sc.estatus_id
      where cs.cotizacion_multiple_id = cm.id
        and ((select public.has_role('admin'::text)) or lower(trim(coalesce(ec.nombre, ec.clave, ''))) <> 'eliminado')
    ) x
  ) a on true
  where (select public.puede_leer_cotizaciones_rendimiento())
    and (p_id is null or cm.id = p_id)
    and ((select public.has_role('admin'::text)) or (
      cm.empleado_id in (select e2.id from public.empleados e2 where e2.auth_user_id = (select auth.uid()))
      and lower(trim(coalesce(cm.estatus_clave, ''))) <> 'eliminado'
    ));
$function$;

CREATE FUNCTION public.buscar_cotizaciones_admin(p_filtros jsonb DEFAULT '{}'::jsonb, p_pagina integer DEFAULT 0, p_tamano integer DEFAULT 20, p_zona text DEFAULT 'America/Mexico_City'::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO pg_catalog, public
AS $function$
  with comparativas as materialized (
    select dato from public.cotizaciones_comparativas_lectura() as f(dato)
  ), raices as materialized (
    select i.dato from public.cotizaciones_individuales_lectura() as i(dato)
    where not exists (
      select 1 from comparativas c, jsonb_array_elements(c.dato->'solicitudes') s
      where s->>'id' = i.dato->>'id'
    )
    union all select dato from comparativas
  ), preparadas as (
    select dato,
      case when dato->>'tipoFila' = 'comparativa'
        then 'CMTRO-' || case when length(dato->>'id') < 3 then lpad(dato->>'id', 3, '0') else dato->>'id' end
        else 'CTRO-' || (dato->>'id') end as folio,
      (coalesce(dato->>'fecha_creacion', dato->>'created_at')::timestamptz at time zone p_zona)::date::text as fecha,
      coalesce(dato->'habitaciones'->>'es', dato->'habitaciones'->>'traduccion',
        case when jsonb_typeof(dato->'habitaciones') = 'string' then dato->>'habitaciones' end, '') as habitaciones
    from raices
  ), filtradas as materialized (
    select dato from preparadas r
    where position(lower(trim(coalesce(p_filtros->>'id', ''))) in lower(r.folio)) > 0
      and position(lower(trim(coalesce(p_filtros->>'cliente', ''))) in lower(coalesce(dato->>'cliente_nombre', ''))) > 0
      and position(lower(trim(coalesce(p_filtros->>'correo', ''))) in lower(coalesce(dato->>'cliente_email', ''))) > 0
      and position(regexp_replace(coalesce(p_filtros->>'telefono', ''), '\D', '', 'g') in regexp_replace(coalesce(dato->>'cliente_telefono', ''), '\D', '', 'g')) > 0
      and position(lower(trim(coalesce(p_filtros->>'hotel', ''))) in lower(coalesce(dato->>'hotel_nombre', ''))) > 0
      and position(lower(trim(coalesce(p_filtros->>'destino', ''))) in lower(coalesce(dato->>'destino_nombre', ''))) > 0
      and position(lower(trim(coalesce(p_filtros->>'tipoDestino', ''))) in lower(coalesce(dato->>'tipo_destino', ''))) > 0
      and (coalesce(p_filtros->>'fechaDesde', '') = '' or r.fecha >= p_filtros->>'fechaDesde')
      and (coalesce(p_filtros->>'fechaHasta', '') = '' or r.fecha <= p_filtros->>'fechaHasta')
      and (coalesce(p_filtros->>'quickFilter', '') = '' or upper(dato->>'estatus_nombre') =
        case p_filtros->>'quickFilter' when 'confirmada' then 'CONFIRMADA' when 'cancelada' then 'CANCELADA' else 'PENDIENTE' end)
      and (coalesce(jsonb_array_length(p_filtros->'empleados'), 0) = 0 or exists (
        select 1 from jsonb_array_elements_text(p_filtros->'empleados') v where lower(trim(v)) = lower(trim(dato->>'empleado_nombre'))))
      and (coalesce(jsonb_array_length(p_filtros->'estatuses'), 0) = 0 or exists (
        select 1 from jsonb_array_elements_text(p_filtros->'estatuses') v where lower(trim(v)) = lower(trim(dato->>'estatus_nombre'))))
      -- Room summary parsing stays with its existing, tested presentation code.
      -- A non-empty room filter deliberately uses the legacy client path.
      and coalesce(p_filtros->>'habitaciones', '') = ''
  ), pagina as (
    select dato from filtradas
    order by coalesce(dato->>'fecha_creacion', dato->>'created_at')::timestamptz desc nulls last,
      dato->>'tipoFila', (dato->>'id')::bigint desc
    limit greatest(1, least(coalesce(p_tamano, 20), 100))
    offset greatest(0, coalesce(p_pagina, 0))::bigint * greatest(1, least(coalesce(p_tamano, 20), 100))
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg((dato - 'solicitudes') || jsonb_build_object('alternativas_total', jsonb_array_length(coalesce(dato->'solicitudes', '[]'::jsonb)))) from pagina), '[]'::jsonb),
    'total', (select count(*) from filtradas),
    'estatuses', coalesce((select jsonb_agg(v order by v) from (select distinct dato->>'estatus_nombre' v from raices where coalesce(dato->>'estatus_nombre', '') <> '') x), '[]'::jsonb),
    'empleados', coalesce((select jsonb_agg(v order by v) from (select distinct dato->>'empleado_nombre' v from raices where coalesce(dato->>'empleado_nombre', '') <> '') x), '[]'::jsonb));
$function$;

CREATE FUNCTION public.obtener_alternativas_cotizacion_admin(p_id bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO pg_catalog, public
AS $function$
  select coalesce((select dato->'solicitudes' from public.cotizaciones_comparativas_lectura(p_id) as f(dato)), '[]'::jsonb);
$function$;

CREATE FUNCTION public.obtener_resumen_dashboard_admin(p_zona text DEFAULT 'America/Mexico_City'::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO pg_catalog, public
AS $function$
  with filas as materialized (
    select dato, lower(trim(coalesce(dato->>'estatus_nombre', ''))) as estatus,
      (coalesce(dato->>'fecha_creacion', dato->>'created_at')::timestamptz at time zone p_zona)::date as fecha
    from public.cotizaciones_individuales_lectura() as f(dato)
  ), referencia as (
    select coalesce(max(fecha), (now() at time zone p_zona)::date) as dia from filas
  ), totales as (
    select count(*) as total,
      count(*) filter (where estatus like '%cotiz%' or estatus like '%confirm%') as cotizadas,
      count(*) filter (where estatus not like '%cotiz%' and estatus not like '%confirm%' and estatus like '%pend%') as pendientes,
      count(*) filter (where estatus not like '%cotiz%' and estatus not like '%confirm%' and estatus not like '%pend%' and estatus like '%cancel%') as canceladas,
      count(*) filter (where fecha >= (select dia - 30 from referencia)) as recientes,
      count(distinct nullif(trim(dato->>'destino_nombre'), '')) as destinos,
      count(distinct nullif(trim(dato->>'hotel_nombre'), '')) as hoteles,
      count(distinct nullif(trim(dato->>'empleado_nombre'), '')) as empleados
    from filas
  ), ranking_base as (
    select * from filas where estatus like '%cotiz%' or estatus like '%confirm%' or (select cotizadas = 0 from totales)
  ), rankings as (
    select campo, coalesce(jsonb_agg(jsonb_build_object('nombre', nombre, 'total', total) order by total desc, nombre), '[]'::jsonb) as datos
    from (
      select campo, nombre, total, row_number() over (partition by campo order by total desc, nombre) as posicion
      from (
        select campo, trim(dato->>campo) as nombre, count(*) as total
        from ranking_base cross join unnest(array['hotel_nombre', 'destino_nombre', 'empleado_nombre']) campo
        where coalesce(trim(dato->>campo), '') <> '' group by campo, trim(dato->>campo)
      ) x
    ) x where posicion <= 8 group by campo
  ), distribuciones as (
    select campo, jsonb_build_object('labels', jsonb_agg(nombre order by total desc, nombre),
      'series', jsonb_agg(total order by total desc, nombre)) as datos
    from (
      select campo, coalesce(nullif(trim(dato->>campo), ''), 'Sin dato') as nombre, count(*) as total
      from filas cross join unnest(array['estatus_nombre', 'tipo_destino']) campo
      group by campo, coalesce(nullif(trim(dato->>campo), ''), 'Sin dato')
    ) x group by campo
  ), dias as (
    select r.dia - n as fecha from referencia r cross join generate_series(29, 0, -1) n
  ), serie as (
    select d.fecha, count(f.fecha) as total from dias d left join filas f on f.fecha = d.fecha group by d.fecha
  )
  select jsonb_build_object('total', total, 'cotizadas', cotizadas, 'pendientes', pendientes,
    'canceladas', canceladas, 'recientes', recientes, 'destinos', destinos, 'hoteles', hoteles, 'empleados', empleados,
    'topHoteles', coalesce((select datos from rankings where campo = 'hotel_nombre'), '[]'::jsonb),
    'topDestinos', coalesce((select datos from rankings where campo = 'destino_nombre'), '[]'::jsonb),
    'topEmpleados', coalesce((select datos from rankings where campo = 'empleado_nombre'), '[]'::jsonb),
    'estatus', coalesce((select datos from distribuciones where campo = 'estatus_nombre'), '{"labels":[],"series":[]}'::jsonb),
    'tipos', coalesce((select datos from distribuciones where campo = 'tipo_destino'), '{"labels":[],"series":[]}'::jsonb),
    'tendencia', (select jsonb_build_object('labels', jsonb_agg(to_char(fecha, 'DD/MM') order by fecha),
      'series', jsonb_agg(total order by fecha), 'fechas', jsonb_agg(fecha::text order by fecha)) from serie))
  from totales;
$function$;

CREATE FUNCTION public.obtener_resumen_destinos_admin()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO pg_catalog, public
AS $function$
  with conteos as (
    select count(*) as total, count(*) filter (where activo) as activos,
      count(*) filter (where tipo = 'NACIONAL') as nacional_total,
      count(*) filter (where tipo = 'NACIONAL' and activo) as nacional_activos,
      count(*) filter (where tipo = 'INTERNACIONAL') as internacional_total,
      count(*) filter (where tipo = 'INTERNACIONAL' and activo) as internacional_activos
    from (select activo, 'NACIONAL' as tipo from public.v_catalogo_nacionales_destinos_admin
      union all select activo, 'INTERNACIONAL' from public.v_catalogo_internacional_destinos_admin) d
  )
  select jsonb_build_object('destinos', jsonb_build_object(
    'total', total, 'activos', activos, 'inactivos', total - activos,
    'nacionales', jsonb_build_object('total', nacional_total, 'activos', nacional_activos, 'inactivos', nacional_total - nacional_activos),
    'internacionales', jsonb_build_object('total', internacional_total, 'activos', internacional_activos, 'inactivos', internacional_total - internacional_activos),
    'configurados', (select count(*) from public.v_catalogo_destinos_configurados),
    'publicables', (select count(*) from public.v_catalogo_destinos_publicables)),
    'geografia', jsonb_build_object('continentes', (select count(*) from public.v_catalogo_internacional_regiones),
      'paises', (select count(*) from public.paises), 'divisionesArea', (select count(*) from public.divisiones_area)),
    'hotelesVinculados', (select count(*) from public.v_hoteles_catalogo_admin where catalogo_destino_id_resuelto is not null))
  from conteos where (select auth.uid()) is not null;
$function$;

revoke execute on function public.puede_leer_cotizaciones_rendimiento() from public, anon;
grant execute on function public.puede_leer_cotizaciones_rendimiento() to authenticated, service_role;

revoke execute on function public.cotizaciones_individuales_lectura() from public, anon;
grant execute on function public.cotizaciones_individuales_lectura() to authenticated, service_role;

revoke execute on function public.cotizaciones_comparativas_lectura(bigint) from public, anon;
grant execute on function public.cotizaciones_comparativas_lectura(bigint) to authenticated, service_role;

revoke execute on function public.buscar_cotizaciones_admin(jsonb, integer, integer, text) from public, anon;
grant execute on function public.buscar_cotizaciones_admin(jsonb, integer, integer, text) to authenticated, service_role;

revoke execute on function public.obtener_alternativas_cotizacion_admin(bigint) from public, anon;
grant execute on function public.obtener_alternativas_cotizacion_admin(bigint) to authenticated, service_role;

revoke execute on function public.obtener_resumen_dashboard_admin(text) from public, anon;
grant execute on function public.obtener_resumen_dashboard_admin(text) to authenticated, service_role;

revoke execute on function public.obtener_resumen_destinos_admin() from public, anon;
grant execute on function public.obtener_resumen_destinos_admin() to authenticated, service_role;

notify pgrst, 'reload schema';
