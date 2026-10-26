-- Ejecutar en el SQL Editor de Supabase.
-- Conserva la respuesta y la lógica de la función pública instalada y añade
-- un filtro por clave primaria, verificando también el publicId del enlace.
BEGIN;

DO $migration$
DECLARE
  source_oid oid;
  source_count integer;
  definition text;
  predicate_pattern text := '([a-z_][a-z0-9_]*)\.public_id\s*=\s*p_public_id\M(?:\s*::\s*(?:uuid|text))?';
  predicate_count integer;
  new_signature text;
BEGIN
  SELECT count(*), min(p.oid::bigint)::oid INTO source_count, source_oid
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'obtener_cotizacion_por_public_id_cliente'
    AND p.pronargs = 1;

  IF source_count <> 1 THEN
    RAISE EXCEPTION 'Se requiere una única función public.obtener_cotizacion_por_public_id_cliente con un argumento.';
  END IF;

  definition := pg_get_functiondef(source_oid);
  SELECT count(*) INTO predicate_count
  FROM regexp_matches(definition, predicate_pattern, 'gi');
  IF predicate_count <> 1 THEN
    RAISE EXCEPTION 'No se identificó un único filtro alias.public_id = p_public_id. Revisar la definición original antes de adaptar la consulta.';
  END IF;

  definition := replace(definition,
    'CREATE OR REPLACE FUNCTION public.obtener_cotizacion_por_public_id_cliente(',
    'CREATE OR REPLACE FUNCTION public.obtener_cotizacion_por_id_cliente(p_id bigint, ');
  IF position('FUNCTION public.obtener_cotizacion_por_id_cliente(' IN definition) = 0 THEN
    RAISE EXCEPTION 'No se pudo adaptar la firma de la función original.';
  END IF;
  definition := regexp_replace(definition, predicate_pattern,
    '(\1.id = p_id AND \&)', 'i');
  EXECUTE definition;

  new_signature := 'public.obtener_cotizacion_por_id_cliente(bigint, '
    || pg_get_function_identity_arguments(source_oid) || ')';
  EXECUTE 'REVOKE ALL ON FUNCTION ' || new_signature || ' FROM PUBLIC';
  EXECUTE 'GRANT EXECUTE ON FUNCTION ' || new_signature || ' TO anon, authenticated';
END;
$migration$;

NOTIFY pgrst, 'reload schema';
COMMIT;
