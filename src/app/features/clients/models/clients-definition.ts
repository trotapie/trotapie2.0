import type {ResourceDefinition} from '../../../shared/models/resource-definition';
export const clientsDefinition:ResourceDefinition = {
  "kind": "clientes",
  "title": "Clientes",
  "description": "Las personas detrás de cada viaje. Consulta sus datos y mantén el contacto.",
  "singular": "cliente",
  "icon": "people",
  "permission": "cotizaciones.create",
  "columns": [
    {
      "key": "telefono",
      "label": "Teléfono"
    },
    {
      "key": "email",
      "label": "Correo"
    }
  ],
  "fields": [
    {
      "key": "nombre",
      "label": "Nombre",
      "required": true
    },
    {
      "key": "nombre_completo",
      "label": "Nombre completo",
      "required": true
    },
    {
      "key": "telefono",
      "label": "Teléfono",
      "type": "tel",
      "required": true
    },
    {
      "key": "email",
      "label": "Correo electrónico",
      "type": "email"
    },
    {
      "key": "tratamiento_id",
      "label": "Tratamiento",
      "type": "select",
      "ref": "treatments"
    },
    {
      "key": "recibir_ofertas",
      "label": "El cliente acepta recibir ofertas",
      "type": "checkbox"
    }
  ]
};
