-- Ejecutar en Supabase antes de guardar diseños de las imágenes del inicio.
-- Conserva las imágenes existentes y sus políticas RLS.
alter table public.imagenes_fondo
  add column if not exists presentacion jsonb not null default '{}'::jsonb;

comment on column public.imagenes_fondo.presentacion is
  'Encuadre (zoom, x, y) y etiqueta (textColor, textBackground, textSize, textPosition) del inicio.';

notify pgrst, 'reload schema';
