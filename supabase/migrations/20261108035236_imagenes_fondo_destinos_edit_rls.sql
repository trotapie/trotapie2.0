set local lock_timeout = '5s';

create function public.puede_gestionar_imagenes_fondo()
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.es_administrador_actual() or public.has_permission('destinos.edit');
$$;

revoke execute on function public.puede_gestionar_imagenes_fondo() from public, anon;
grant execute on function public.puede_gestionar_imagenes_fondo() to authenticated;

alter policy imagenes_fondo_admin_insert on public.imagenes_fondo
  to authenticated with check ((select public.puede_gestionar_imagenes_fondo()));

alter policy imagenes_fondo_admin_update on public.imagenes_fondo
  to authenticated using ((select public.puede_gestionar_imagenes_fondo()))
  with check ((select public.puede_gestionar_imagenes_fondo()));

alter policy imagenes_fondo_admin_delete on public.imagenes_fondo
  to authenticated using ((select public.puede_gestionar_imagenes_fondo()));

alter policy imagenes_fondo_traducciones_admin_insert on public.imagenes_fondo_traducciones
  to authenticated with check ((select public.puede_gestionar_imagenes_fondo()));

alter policy imagenes_fondo_traducciones_admin_update on public.imagenes_fondo_traducciones
  to authenticated using ((select public.puede_gestionar_imagenes_fondo()))
  with check ((select public.puede_gestionar_imagenes_fondo()));

alter policy imagenes_fondo_traducciones_admin_delete on public.imagenes_fondo_traducciones
  to authenticated using ((select public.puede_gestionar_imagenes_fondo()));

notify pgrst, 'reload schema';
