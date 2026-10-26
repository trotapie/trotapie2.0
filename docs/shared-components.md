# Componentes compartidos de Trotapie

Origen de los comportamientos: `D:/Users/Alex_Saenz/Documents/Proyectos/Trotapie/src/app/shared`.
Destino de los componentes adaptados: `src/app/shared/components`. Se mantienen los HTML y SCSS separados de los TS; los servicios están en `shared/services` o `core/services`, y los modelos y utilidades en sus propias carpetas.

Vista de prueba: `http://127.0.0.1:4307/vista-previa/componentes`. Utiliza ejemplos locales y no guarda cambios en la base de datos.

| Componente original | Implementación nueva | Comportamiento conservado |
| --- | --- | --- |
| tp-input | components/tp-input | Formularios Angular, límites numéricos, valor vacío y escritura decimal |
| tp-textarea | components/tp-textarea | Formularios, filas, límite de caracteres, error y deshabilitado |
| tp-search-input | components/tp-search-input | Búsqueda manual, retraso configurable, limpieza y cancelación del temporizador |
| tp-select-search | components/tp-select-search | Búsqueda, grupos, selección, opciones deshabilitadas y limpieza |
| tp-multiselect | components/tp-multiselect | Selección múltiple, selección de opciones visibles y conservación de selecciones ocultas |
| phone-input | components/phone-input | Lada independiente, búsqueda de país, solo dígitos y máximo de 15 caracteres |
| time-picker | components/time-picker | AM/PM, conversión a HH:mm y hora opcional |
| date-range-filter | components/date-range-filter | Dos meses, inicio/fin, orden del rango, límites, noches, aplicar y borrar |
| custom-switch | components/custom-switch | Formularios, estado y evento de cambio |
| color-picker | components/color-picker | Color nativo, edición HEX y normalización |
| tp-actions-menu | components/tp-actions-menu | Acciones configurables, opciones deshabilitadas, acciones peligrosas y cierre exterior |
| tp-toast | components/tp-toast + shared/services/tp-toast.service.ts | Tipos de mensaje, duración y cierre manual |
| blocking-loader | components/blocking-loader | Carga bloqueante con título, mensaje y fondo opcional |
| charts | components/charts | Área, barras y dona, valores, hover y eventos de selección |
| folder-image-manager | components/folder-image-manager | Carpetas, búsqueda, activación, selección múltiple, acciones, tipos y eventos de arrastre y orden |
| drive-image-assignment-dialog | components/drive-image-assignment-dialog | Consulta de Drive mediante el servicio existente, asignación por carpeta/imagen y confirmación agrupada |
| imagenes-carrusel | components/imagenes-carrusel + components/photo-carousel | Galería ampliada, miniaturas, filtro por tipo, avance automático y acceso a cotización |
| banner | components/banner | Firma del asesor y enlaces de correo y WhatsApp |
| image-text-panel | components/image-text-panel + models/image-text-style.ts | Fondo del texto, color, transparencia, blur y estilos independientes |
| estatus | components/estatus + components/badge | Estado visual reutilizable |
| importe / porcentaje | shared/directives | Formato de moneda, dos decimales y límites de porcentaje |
| svg-sanitizer | shared/utils/svg-sanitizer.ts | Utilidad de limpieza de SVG |
| scroll | shared/directives/scroll.directive.ts | Scroll interno y scrollbar nativo fino, sin añadir elementos que aumenten la altura |
| tp-select | shared/directives/tp-select.directive.ts | Estilo para selectores nativos; los selectores con búsqueda usan el componente adaptado |
| animations | core/services/motion.service.ts + shared/directives | GSAP, limpieza de animaciones y preferencia de movimiento reducido |
| flyer-editor | features/circuits/flyer + features/circuits/components | Se utiliza el editor nuevo ya existente, con servicios y subcomponentes separados |
| material.module | Sin módulo agregado equivalente | Los componentes importan solo los controles que necesitan; CDK se usa para posicionar overlays |

## Integración

- `ResourceForm` usa los inputs, textarea, switch y selector con búsqueda adaptados. Mantiene las validaciones de Angular y deshabilita los controles durante el guardado y las vistas de solo lectura.
- `FilterBar` usa el buscador compartido.
- `DataTable` utiliza el menú de acciones y fechas en español.
- La raíz de la aplicación incluye el host de notificaciones.
- El contenedor de overlays de cada modal mantiene los selectores dentro de la capa del diálogo nativo. Así permanecen interactivos y no se recortan en el scroll.
- Los widgets específicos emiten eventos; sus consumidores siguen siendo responsables de guardar, confirmar eliminaciones y aplicar sus permisos.

Para reutilizar un control, importar su clase desde su carpeta y agregarla al `imports` del componente consumidor. Los controles de formulario aceptan `ngModel` y `formControl`. Los selectores originales `app-*` se conservaron como aliases donde corresponde.

## Comprobaciones

Se revisaron búsquedas, selección múltiple, opciones deshabilitadas, límites numéricos, teléfono, escritura y formato de importes/porcentajes, horario, inversión del rango de fechas, creación local de carpetas, galería y validaciones dentro de un modal. Las pruebas de Drive deben hacerse con una carpeta autorizada; esta migración no realiza importaciones automáticamente.
