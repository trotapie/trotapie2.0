# Migraciones de Supabase

`migrations/` contiene el historial SQL de producción de Trotapie. Cada archivo usa la versión y el nombre registrados en Supabase. Una versión antigua se registró sin sentencias y tiene un archivo de solo comentarios para conservar su lugar en el historial.

Crea los próximos archivos con `supabase migration new <nombre>`. Antes de aplicar cambios en un proyecto enlazado, compara sus versiones con `supabase migration list --linked` y revisa la tanda con `supabase db push --dry-run`.

Las primeras migraciones dependen de tablas del esquema legado. Para reconstruir la base desde cero hace falta un esquema base compatible. El proyecto DEV se creó a partir de una copia con un historial distinto.
