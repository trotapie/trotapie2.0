import type {ResourceDefinition} from '../../../shared/models/resource-definition';
export const circuitsDefinition:ResourceDefinition = {
  "kind": "circuitos",
  "title": "Circuitos",
  "description": "Crea itinerarios que conecten destinos, hoteles y experiencias.",
  "singular": "circuito",
  "icon": "suitcase",
  "permission": "circuitos.edit",
  "visual": true,
  "columns": [
    {
      "key": "duracion_dias",
      "label": "Días"
    }
  ],
  "fields": [
    {
      "key": "nombre",
      "label": "Nombre del circuito",
      "required": true
    },
    {
      "key": "descripcion",
      "label": "Descripción del viaje",
      "type": "textarea"
    },
    {
      "key": "precio_total",
      "label": "Precio total",
      "type": "number",
      "min": 0
    },
    {
      "key": "duracion_dias",
      "label": "Días",
      "type": "number",
      "required": true,
      "min": 1
    },
    {
      "key": "duracion_noches",
      "label": "Noches",
      "type": "number",
      "required": true,
      "min": 0
    },
    {
      "key": "imagen_principal",
      "label": "Fotografía principal",
      "type": "url"
    }
  ]
};
