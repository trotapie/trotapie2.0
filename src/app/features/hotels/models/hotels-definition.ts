import type {ResourceDefinition} from '../../../shared/models/resource-definition';
export const hotelsDefinition:ResourceDefinition = {
  "kind": "hoteles",
  "title": "Hoteles",
  "description": "Estancias para cada viaje. Gestiona alojamientos, fotografías y condiciones.",
  "singular": "hotel",
  "icon": "hotel",
  "permission": "hoteles.edit",
  "visual": false,
  "columns": [
    {
      "key": "regimen",
      "label": "Régimen"
    }
  ],
  "fields": [
    {
      "key": "nombre_hotel",
      "label": "Nombre del hotel",
      "required": true
    },
    {
      "key": "catalogo_destino_id",
      "label": "Destino del catálogo",
      "type": "select",
      "ref": "destinations",
      "required": true
    },
    {
      "key": "descripcion",
      "label": "Descripción",
      "type": "textarea"
    },
    {
      "key": "estrellas",
      "label": "Estrellas",
      "type": "select",
      "options": [
        {
          "value": 1,
          "label": "1 estrellas"
        },
        {
          "value": 2,
          "label": "2 estrellas"
        },
        {
          "value": 3,
          "label": "3 estrellas"
        },
        {
          "value": 4,
          "label": "4 estrellas"
        },
        {
          "value": 5,
          "label": "5 estrellas"
        }
      ]
    },
    {
      "key": "fondo",
      "label": "Fotografía principal",
      "type": "url"
    },
    {
      "key": "ubicacion",
      "label": "Ubicación / enlace del mapa"
    },
    {
      "key": "regimen_id",
      "label": "Régimen principal",
      "type": "select",
      "ref": "regimes"
    },
    {
      "key": "orden",
      "label": "Orden de presentación",
      "type": "number",
      "min": 0
    },
    {
      "key": "galleryUrls",
      "label": "Galería de fotografías",
      "type": "textarea",
      "hint": "Una dirección pública por línea. Se conservan las imágenes existentes."
    }
  ]
};
