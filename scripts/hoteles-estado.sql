-- Ejecutar en Supabase para habilitar el estado de los hoteles.
-- No modifica ni sustituye las políticas RLS existentes de hoteles.
begin;

alter table public.hoteles add column if not exists activo boolean not null default true;
grant select (activo), update (activo) on public.hoteles to authenticated;
grant select (activo) on public.hoteles to anon;

create or replace view public.v_hoteles_gestion_admin
with (security_invoker = true) as
select catalogo.*, hotel.fondo, hotel.activo
from public.v_hoteles_catalogo_admin catalogo
join public.hoteles hotel on hotel.id = catalogo.id;

revoke all on public.v_hoteles_gestion_admin from anon;
grant select on public.v_hoteles_gestion_admin to authenticated;

notify pgrst, 'reload schema';
commit;
