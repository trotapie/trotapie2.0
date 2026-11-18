alter table public.regimen
  add column icono_svg text check (char_length(icono_svg) <= 12000),
  add column muestra_plan_todo_incluido boolean not null default false;

alter table public.regimen_traducciones
  add column descripcion_general text;

-- Preserve existing hotel-specific content even if the catalog name changes later.
update public.regimen as r
set muestra_plan_todo_incluido = true
where lower(btrim(r.descripcion)) = 'todo incluido'
   or exists (
     select 1 from public.regimen_traducciones as t
     where t.regimen_id = r.id and t.idioma_id = 1
       and lower(btrim(t.descripcion)) = 'todo incluido'
   );

-- Catalog edits and their translations are saved together, under the existing RLS policies.
create function public.guardar_contenido_regimen_hotel(
  p_id bigint, p_nombre text, p_icono_svg text, p_traducciones jsonb
) returns bigint
language plpgsql security invoker set search_path = ''
as $$
declare
  v_id bigint;
begin
  if nullif(btrim(p_nombre), '') is null then
    raise exception 'El nombre del régimen es obligatorio.';
  end if;

  if p_id is null then
    insert into public.regimen (descripcion, icono_svg, muestra_plan_todo_incluido)
    values (btrim(p_nombre), p_icono_svg, lower(btrim(p_nombre)) = 'todo incluido')
    returning id into v_id;
  else
    update public.regimen
    set descripcion = btrim(p_nombre), icono_svg = p_icono_svg,
        muestra_plan_todo_incluido = muestra_plan_todo_incluido or lower(btrim(p_nombre)) = 'todo incluido'
    where id = p_id
    returning id into v_id;
    if not found then
      raise exception 'No se pudo editar el régimen.';
    end if;
  end if;

  insert into public.regimen_traducciones (regimen_id, idioma_id, descripcion, descripcion_general)
  select v_id, t.idioma_id, t.descripcion, t.descripcion_general
  from jsonb_to_recordset(p_traducciones) as t(idioma_id bigint, descripcion text, descripcion_general text)
  on conflict (regimen_id, idioma_id) do update
  set descripcion = excluded.descripcion, descripcion_general = excluded.descripcion_general;

  return v_id;
end;
$$;

revoke all on function public.guardar_contenido_regimen_hotel(bigint, text, text, jsonb) from public, anon;
grant execute on function public.guardar_contenido_regimen_hotel(bigint, text, text, jsonb) to authenticated;
notify pgrst, 'reload schema';
