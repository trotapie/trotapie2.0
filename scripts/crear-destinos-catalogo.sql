-- Ejecutar en Supabase si catalogo_destinos todavía no permite crear destinos.
-- Conserva la restricción de administración utilizada por las políticas de edición.
begin;

grant insert (nombre, slug, orden, prioridad, division_area_id, tipo_turistico_id, imagen_destino, activo)
  on public.catalogo_destinos to authenticated;
grant usage, select on sequence public.catalogo_destinos_id_seq to authenticated;

drop policy if exists catalogo_destinos_insert_admin on public.catalogo_destinos;
create policy catalogo_destinos_insert_admin
  on public.catalogo_destinos for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'admin'
    )
  );

commit;
