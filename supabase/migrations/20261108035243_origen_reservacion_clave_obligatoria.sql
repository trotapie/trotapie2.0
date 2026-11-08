set local lock_timeout = '5s';

alter table public.origen_reservacion
  alter column clave set not null;

notify pgrst, 'reload schema';
