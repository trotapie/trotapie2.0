-- Ejecutar en el SQL Editor de Supabase ANTES de desplegar el frontend.
-- Todos los empleados quedan ocultos por defecto. Después, habilitar a los
-- asesores reales desde Equipo > Editar > Mostrar como asesor en cotizaciones.
-- No se cambian permisos de acceso ni asignaciones históricas.
BEGIN;

ALTER TABLE public.empleados
  ADD COLUMN IF NOT EXISTS mostrar_en_cotizaciones boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.empleados.mostrar_en_cotizaciones IS
  'Permite seleccionar al empleado activo como asesor en cotizaciones públicas e internas.';

-- El endpoint público no expone correos, teléfonos ni datos de acceso.
CREATE OR REPLACE FUNCTION public.obtener_asesores_cotizacion()
RETURNS TABLE (id bigint, nombre text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT e.id::bigint, e.nombre::text
  FROM public.empleados e
  JOIN public.estatus_empleado s ON s.id = e.estatus_id
  WHERE e.mostrar_en_cotizaciones IS TRUE
    AND lower(trim(s.clave)) = 'activo'
    AND s.activo IS TRUE
  ORDER BY e.id;
$$;

REVOKE ALL ON FUNCTION public.obtener_asesores_cotizacion() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obtener_asesores_cotizacion() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.validar_asesor_cotizacion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Editar una cotización antigua conserva su asesor aunque ahora esté oculto.
  IF TG_OP = 'UPDATE' THEN
    IF NEW.empleado_id IS NOT DISTINCT FROM OLD.empleado_id THEN
      RETURN NEW;
    END IF;
  END IF;

  PERFORM e.id
  FROM public.empleados e
  JOIN public.estatus_empleado s ON s.id = e.estatus_id
  WHERE e.id = NEW.empleado_id
    AND e.mostrar_en_cotizaciones IS TRUE
    AND lower(trim(s.clave)) = 'activo'
    AND s.activo IS TRUE
  FOR SHARE OF e, s;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Selecciona un asesor activo y habilitado para cotizaciones.'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validar_asesor_cotizacion() FROM PUBLIC;

DROP TRIGGER IF EXISTS validar_asesor_cotizacion ON public.solicitudes_cotizacion;
CREATE TRIGGER validar_asesor_cotizacion
BEFORE INSERT OR UPDATE OF empleado_id ON public.solicitudes_cotizacion
FOR EACH ROW EXECUTE FUNCTION public.validar_asesor_cotizacion();

DROP TRIGGER IF EXISTS validar_asesor_cotizacion ON public.cotizaciones_multiples;
CREATE TRIGGER validar_asesor_cotizacion
BEFORE INSERT OR UPDATE OF empleado_id ON public.cotizaciones_multiples
FOR EACH ROW EXECUTE FUNCTION public.validar_asesor_cotizacion();

NOTIFY pgrst, 'reload schema';
COMMIT;
