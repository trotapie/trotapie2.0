set local lock_timeout = '5s';

alter function public.obtener_cotizacion_por_id_cliente(bigint, uuid)
  set search_path = '';
