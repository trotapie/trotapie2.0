import type {SupabaseClient} from '@supabase/supabase-js';

/** Delete only the database record. Drive files are never modified. */
export async function deleteHomeImage(client: SupabaseClient, id: number): Promise<void> {
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('La imagen no tiene un ID válido.');
  const {data, error} = await client.from('imagenes_fondo').delete().eq('id', id).select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('No se eliminó la imagen. Puede que ya no exista o que no tengas permisos.');
}
