-- Ejecutar en el SQL Editor de Supabase antes de desplegar el frontend.
BEGIN;

CREATE TABLE IF NOT EXISTS public.configuracion_cotizaciones (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  max_habitaciones integer NOT NULL DEFAULT 8 CHECK (max_habitaciones > 0),
  max_personas_por_habitacion integer NOT NULL DEFAULT 8 CHECK (max_personas_por_habitacion > 0)
);
INSERT INTO public.configuracion_cotizaciones (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.configuracion_cotizaciones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.configuracion_cotizaciones FROM anon, authenticated;
GRANT SELECT ON public.configuracion_cotizaciones TO anon, authenticated;
DROP POLICY IF EXISTS leer_configuracion_cotizaciones ON public.configuracion_cotizaciones;
CREATE POLICY leer_configuracion_cotizaciones ON public.configuracion_cotizaciones
  FOR SELECT TO anon, authenticated USING (true);
GRANT UPDATE (max_habitaciones, max_personas_por_habitacion) ON public.configuracion_cotizaciones TO authenticated;
DROP POLICY IF EXISTS administrar_configuracion_cotizaciones ON public.configuracion_cotizaciones;
CREATE POLICY administrar_configuracion_cotizaciones ON public.configuracion_cotizaciones
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'));

CREATE OR REPLACE FUNCTION public.validar_limites_habitaciones_cotizacion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  limites public.configuracion_cotizaciones%ROWTYPE;
  distribucion jsonb;
  habitacion jsonb;
  adultos numeric;
  menores numeric;
BEGIN
  -- No invalidar cotizaciones históricas al editar otros datos.
  IF TG_OP = 'UPDATE' THEN
    IF NEW.habitaciones::jsonb IS NOT DISTINCT FROM OLD.habitaciones::jsonb THEN RETURN NEW; END IF;
  END IF;
  SELECT * INTO STRICT limites FROM public.configuracion_cotizaciones WHERE id = 1;
  distribucion := NEW.habitaciones::jsonb -> 'distribucion';
  IF distribucion IS NULL OR jsonb_typeof(distribucion) <> 'array' THEN
    RAISE EXCEPTION 'La cotización debe incluir la distribución de adultos y menores por habitación.' USING ERRCODE = '23514';
  END IF;
  IF jsonb_array_length(distribucion) < 1 OR jsonb_array_length(distribucion) > limites.max_habitaciones THEN
    RAISE EXCEPTION 'Se permiten entre 1 y % habitaciones.', limites.max_habitaciones USING ERRCODE = '23514';
  END IF;
  FOR habitacion IN SELECT value FROM jsonb_array_elements(distribucion) LOOP
    IF jsonb_typeof(habitacion->'adultos') IS DISTINCT FROM 'number'
       OR jsonb_typeof(habitacion->'menores') IS DISTINCT FROM 'number' THEN
      RAISE EXCEPTION 'La distribución de personas no es válida.' USING ERRCODE = '23514';
    END IF;
    adultos := (habitacion->>'adultos')::numeric;
    menores := (habitacion->>'menores')::numeric;
    IF adultos <> trunc(adultos) OR menores <> trunc(menores) OR adultos < 1 OR menores < 0
       OR adultos + menores > limites.max_personas_por_habitacion THEN
      RAISE EXCEPTION 'Se permite un máximo de % personas por habitación, incluyendo adultos y menores, con al menos un adulto.', limites.max_personas_por_habitacion USING ERRCODE = '23514';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validar_limites_habitaciones_cotizacion() FROM PUBLIC;
DROP TRIGGER IF EXISTS validar_limites_habitaciones ON public.solicitudes_cotizacion;
CREATE TRIGGER validar_limites_habitaciones BEFORE INSERT OR UPDATE OF habitaciones
  ON public.solicitudes_cotizacion FOR EACH ROW EXECUTE FUNCTION public.validar_limites_habitaciones_cotizacion();
DROP TRIGGER IF EXISTS validar_limites_habitaciones ON public.cotizaciones_multiples;
CREATE TRIGGER validar_limites_habitaciones BEFORE INSERT OR UPDATE OF habitaciones
  ON public.cotizaciones_multiples FOR EACH ROW EXECUTE FUNCTION public.validar_limites_habitaciones_cotizacion();

NOTIFY pgrst, 'reload schema';
COMMIT;

-- Para cambiar los límites posteriormente:
-- UPDATE public.configuracion_cotizaciones
-- SET max_habitaciones = 8, max_personas_por_habitacion = 8 WHERE id = 1;
