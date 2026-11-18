insert into public.textos_configurables (seccion) values ('inicio');

alter policy textos_configurables_lectura on public.textos_configurables
  using (seccion in ('cotizacion', 'inicio'));
alter policy textos_configurables_traducciones_lectura on public.textos_configurables_traducciones
  using (seccion in ('cotizacion', 'inicio'));

-- The Edge Function validates the admin and the translations before this atomic write.
create function public.publicar_textos_inicio(
  p_version integer, p_textos jsonb, p_traducciones jsonb
) returns integer language plpgsql security definer set search_path = '' as $$
declare
  nueva_version integer;
  codigo text;
begin
  update public.textos_configurables
  set textos = p_textos, version = version + 1
  where seccion = 'inicio' and version = p_version
  returning version into nueva_version;

  if not found then
    raise exception using errcode = '40001', message = 'La configuración cambió mientras editabas.';
  end if;

  foreach codigo in array array['en', 'fr', 'de', 'pt'] loop
    insert into public.textos_configurables_traducciones (seccion, idioma, textos)
    values ('inicio', codigo, p_traducciones -> codigo)
    on conflict (seccion, idioma) do update set textos = excluded.textos;
  end loop;
  return nueva_version;
end;
$$;
revoke all on function public.publicar_textos_inicio(integer, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.publicar_textos_inicio(integer, jsonb, jsonb) to service_role;
