create table public.textos_configurables (
  seccion text primary key,
  textos jsonb not null default '{}' check (jsonb_typeof(textos) = 'object'),
  version integer not null default 0
);

create table public.textos_configurables_traducciones (
  seccion text not null references public.textos_configurables(seccion) on delete cascade,
  idioma text not null check (idioma in ('en', 'fr', 'de', 'pt')),
  textos jsonb not null check (jsonb_typeof(textos) = 'object'),
  primary key (seccion, idioma)
);

insert into public.textos_configurables (seccion) values ('cotizacion');

alter table public.textos_configurables enable row level security;
alter table public.textos_configurables_traducciones enable row level security;
revoke all on public.textos_configurables, public.textos_configurables_traducciones from public, anon, authenticated;
grant select on public.textos_configurables, public.textos_configurables_traducciones to authenticated, service_role;

create policy textos_configurables_lectura on public.textos_configurables
  for select to authenticated using (seccion = 'cotizacion');
create policy textos_configurables_traducciones_lectura on public.textos_configurables_traducciones
  for select to authenticated using (seccion = 'cotizacion');

-- The Edge Function checks the caller and translates before publishing atomically.
create function public.publicar_textos_cotizacion(
  p_version integer, p_textos jsonb, p_traducciones jsonb
) returns integer language plpgsql security definer set search_path = '' as $$
declare
  nueva_version integer;
  codigo text;
begin
  update public.textos_configurables
  set textos = p_textos, version = version + 1
  where seccion = 'cotizacion' and version = p_version
  returning version into nueva_version;

  if not found then
    raise exception using errcode = '40001', message = 'La configuración cambió mientras editabas.';
  end if;

  foreach codigo in array array['en', 'fr', 'de', 'pt'] loop
    insert into public.textos_configurables_traducciones (seccion, idioma, textos)
    values ('cotizacion', codigo, p_traducciones -> codigo)
    on conflict (seccion, idioma) do update set textos = excluded.textos;
  end loop;
  return nueva_version;
end;
$$;
revoke all on function public.publicar_textos_cotizacion(integer, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.publicar_textos_cotizacion(integer, jsonb, jsonb) to service_role;
