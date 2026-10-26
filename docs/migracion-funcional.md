# Migración funcional: seguimiento

## Alcance vigente

Completar el proyecto nuevo sin modificar el anterior ni escribir en producción durante las verificaciones locales.

**Circuitos y flyers están aplazados por indicación del usuario: falta su definición.** No se implementa su detalle público ni su editor en esta entrega. Cabañas y promociones siguen pendientes de confirmar alcance.

## Matriz de trabajo

| Capacidad | Estado | Verificación pendiente |
| --- | --- | --- |
| Protección de cambios en hoteles y catálogos | Implementada | Recorrido en navegador con sesión de prueba |
| Protección de contenido de destinos y modal de fotografías | Implementada | Guardado real y errores de las integraciones |
| Protección de creación de cotizaciones administrativas y solicitudes públicas | Implementada | Recorrido completo con datos aislados |
| Editor completo de hoteles | Pendiente | Contratos, relaciones, traducciones, horarios y galería |
| Catálogos completos y relaciones de tarifas/políticas | Pendiente | Conservación de datos y permisos por catálogo |
| Cotizaciones internacionales | Pendiente | Selección geográfica y hoteles elegibles |
| Asignación de solicitudes públicas | Pendiente de definición | Política de negocio y validación del servidor |
| Condiciones, plantillas e impresión | Pendiente | Paridad con el sistema anterior |
| Configuración administrativa adicional | Pendiente de alcance | Hoteles, permisos e información IP |
| Enlaces antiguos y vistas previas sociales | Pendiente | Hosting, API y URLs de recuperación |
| Circuitos y flyers | Aplazados | Definición funcional del usuario |
| Cabañas y promociones | Pendiente de alcance | Modelo y operaciones necesarias |

## Primera entrega: protección de cambios

- Una modificación pendiente solicita confirmación al salir de la ruta o cerrar el editor del catálogo.
- La cancelación conserva los valores. Revertir los valores originales elimina la advertencia.
- Cambiar de catálogo también se protege cuando Angular reutiliza la misma ruta con otro parámetro.
- Cerrar el diseño de una fotografía comprueba sus cambios, sin descartar los del destino.
- Los guardados parciales de fotos o estados de atracciones actualizan únicamente su parte de la referencia guardada.
- Al guardar una cotización, la navegación posterior no solicita descartar la captura ya guardada.
- Mientras hay un guardado en curso se bloquea la salida interna.
- `beforeunload` se registra únicamente mientras hay datos pendientes o una operación en curso. El navegador controla el texto y puede limitar la advertencia según sus políticas de interacción.
- No se añadieron guardas ni funciones específicas de circuitos o flyers.

### Comprobación local

```bash
npm run test:core
npx ng build
```

Se usa Angular CLI directamente para compilar sin ejecutar los generadores de entorno o traducciones de `npm run build`. Se requiere la configuración local generada previamente. No se registran aquí valores de configuración ni credenciales.

Las pruebas unitarias cubren snapshots mutables, reversión, guardados parciales, confirmación/cancelación, bloqueo durante guardado y alta/baja de `beforeunload`. No sustituyen una prueba E2E de Angular o de Supabase.

### Recorrido manual antes de aceptar la entrega

1. Abrir un hotel existente y cerrarlo sin editar: no debe pedir confirmación.
2. Cambiar un campo, cancelar el cierre y comprobar que conserva su valor.
3. Repetir con Escape, clic en el fondo del diálogo, botón Cancelar y enlace de navegación.
4. Cambiar y restablecer el campo original: no debe pedir confirmación.
5. Cambiar de catálogo con datos pendientes, también usando Atrás/Adelante del navegador.
6. Editar texto de un destino y el diseño de una foto. Cancelar el cierre del diseño y comprobar que ambos conservan sus cambios.
7. Guardar solo la foto o el estado de una atracción: otros textos pendientes deben seguir protegidos.
8. Forzar un error de guardado en el entorno de pruebas: los cambios deben seguir protegidos.
9. Crear una cotización de prueba y comprobar que navega al detalle sin una confirmación redundante.
10. Actualizar/cerrar la pestaña con datos pendientes y después de guardarlos; comprobar que la advertencia corresponde al estado actual.

## Límites de esta validación

No se han creado usuarios, enviado correos, ejecutado migraciones ni realizado escrituras de prueba sobre Supabase. El entorno de datos aislado y las cuentas de prueba siguen pendientes de confirmar. No se ha desplegado ni sustituido producción.
