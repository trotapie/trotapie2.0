import type {ResourceDefinition} from '../../../shared/models/resource-definition';
export const destinationsDefinition:ResourceDefinition = {
  "kind": "destinos",
  "title": "Destinos",
  "description": "Lugares que inspiran. Organiza tu catálogo y prepara la próxima escapada.",
  "singular": "destino",
  "icon": "map",
  "permission": "destinos.edit",
  "visual": true,
  "columns": [
    {
      "key": "orden",
      "label": "Orden"
    }
  ],
  "fields": [
    {
      "key": "nombre",
      "label": "Nombre del destino",
      "required": true
    },
    {
      "key": "imagen_destino",
      "label": "Fotografía principal",
      "imagePreview": true,
      "type": "url",
      "hint": "Usa una dirección pública de la imagen de tu catálogo o Drive."
    },
    {
      "key": "orden",
      "label": "Orden de presentación",
      "type": "number",
      "min": 0
    },
    {
      "key": "prioridad",
      "label": "Prioridad",
      "type": "select",
      "only": "edit",
      "options": [
        {
          "value": 1,
          "label": "Destacado"
        },
        {
          "value": 2,
          "label": "Normal"
        }
      ]
    },
    {
      "key": "division_area_id",
      "label": "División de área",
      "type": "select",
      "ref": "areas",
      "only": "edit"
    },
    {
      "key": "tipo_turistico_id",
      "label": "Tipo de experiencia",
      "type": "select",
      "ref": "tour-types",
      "only": "edit"
    },
    {
      "key": "tipo_desino_id",
      "label": "Tipo de destino",
      "type": "select",
      "only": "create",
      "options": [
        {
          "value": 1,
          "label": "Nacional"
        },
        {
          "value": 2,
          "label": "Internacional"
        }
      ]
    },
    {
      "key": "destino_padre_id",
      "label": "Destino padre",
      "type": "number",
      "only": "create"
    },
    {
      "key": "continente_id",
      "label": "Continente",
      "type": "select",
      "ref": "continents",
      "only": "create"
    },
    {
      "key": "activo",
      "label": "Mostrar destino en el catálogo público",
      "type": "checkbox"
    }
  ]
};
