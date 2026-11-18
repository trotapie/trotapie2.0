# Activar los textos configurables de Cotizaciones e Inicio

1. Aplica `supabase/migrations/20261118000000_textos_configurables.sql` en el ambiente correspondiente. Si ya está aplicada, no la repitas. Después aplica `supabase/migrations/20261118000001_lectura_publica_textos_cotizacion.sql` para que la solicitud pública pueda leer los textos publicados sin iniciar sesión.
2. Crea un proyecto de Google Apps Script con el contenido de `quote-translation.gs`. En **Configuración del proyecto → Propiedades de la secuencia de comandos**, agrega `QUOTE_TRANSLATION_SCRIPT_SECRET` con un secreto aleatorio exclusivo de ese ambiente.
3. Publica el script como aplicación web, con ejecución como propietario y acceso para **Cualquier persona**. La función de Supabase llama sin una sesión de Google; el script rechaza las solicitudes sin el secreto antes de traducir. Copia la URL del despliegue, que termina en `/exec`.
4. En los secretos de la Edge Function configura `QUOTE_TRANSLATION_SCRIPT_URL` con esa URL y `QUOTE_TRANSLATION_SCRIPT_SECRET` con el mismo valor del paso 2. No los incluyas en Angular ni en Git.
5. Aplica `supabase/migrations/20261118000002_textos_configurables_inicio.sql` después de las migraciones anteriores para habilitar los textos de Inicio.
6. Despliega o vuelve a desplegar `guardar-textos-cotizacion` en Supabase. Conserva el mismo nombre y los mismos secretos para Cotizaciones e Inicio. La función valida el token con Supabase Auth y verifica el rol de admin antes de traducir o publicar. Si el Apps Script ya está desplegado, no necesitas volver a desplegarlo.

Para verificar el flujo, abre **Configuración general → Textos**, cambia «Nueva cotización» o «Teléfono» y guarda. Verifica el cambio en una cotización administrativa y en la solicitud pública (abre `/solicitar/<id-del-hotel>` en una ventana privada), en español y en otro idioma. Para restablecer los textos predeterminados de ambas pantallas, vuelve a escribir el texto original del editor y guarda.

Para verificar Inicio, elige **Textos → Inicio**, cambia el título o «Descubrir destino» y guarda. Abre `/` en una ventana privada y comprueba el cambio en español y en otro idioma. Si editaste «Descubrir destino», verifica que cambió en todas las tarjetas de Inicio.

La configuración guarda solo los textos personalizados. Los valores predeterminados siguen en la app. Al guardar, solo los textos nuevos o modificados se envían a traducir en una llamada; si falla la traducción, no se publica el bloque.
