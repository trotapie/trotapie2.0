-- Ejecutar en Supabase antes de usar el zoom del editor de fotografías.
-- No modifica archivos originales ni elimina imágenes o políticas RLS.
alter table public.atracciones_imagenes
  add column if not exists imagen_zoom double precision not null default 1,
  add column if not exists imagen_x double precision not null default 50,
  add column if not exists imagen_y double precision not null default 50;

notify pgrst, 'reload schema';
