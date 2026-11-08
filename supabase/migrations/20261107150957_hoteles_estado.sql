set local lock_timeout = '5s';

alter table public.hoteles
  add column if not exists activo boolean not null default true;

alter policy "Permitir insertar hoteles" on public.hoteles
  to authenticated
  with check ((select public.es_administrador_actual() or public.has_permission('hoteles.edit')));

alter policy "Permitir actualizar hoteles" on public.hoteles
  to authenticated
  using ((select public.es_administrador_actual() or public.has_permission('hoteles.edit')))
  with check ((select public.es_administrador_actual() or public.has_permission('hoteles.edit')));

alter policy "Permitir eliminar hoteles" on public.hoteles
  to authenticated
  using ((select public.es_administrador_actual() or public.has_permission('hoteles.edit')));

revoke insert, update, delete, truncate on public.hoteles from public, anon;
revoke truncate on public.hoteles from authenticated;
grant select (activo), update (activo) on public.hoteles to authenticated;
grant select (activo) on public.hoteles to anon;

create or replace view public.v_hoteles_gestion_admin
with (security_invoker = true) as
select catalogo.*, hotel.fondo, hotel.activo
from public.v_hoteles_catalogo_admin catalogo
join public.hoteles hotel on hotel.id = catalogo.id;

revoke all on public.v_hoteles_gestion_admin from public, anon;
grant select on public.v_hoteles_gestion_admin to authenticated;

notify pgrst, 'reload schema';
