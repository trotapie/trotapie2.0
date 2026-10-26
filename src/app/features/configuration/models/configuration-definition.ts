import type {ResourceDefinition} from '../../../shared/models/resource-definition';
export const configurationDefinition:ResourceDefinition = {
  "kind": "configuracion",
  "title": "Roles y permisos",
  "description": "Define quién puede consultar, crear y administrar cada módulo.",
  "singular": "rol",
  "icon": "settings",
  "permission": "empleados.manage",
  "columns": [
    {
      "key": "key",
      "label": "Clave del rol"
    }
  ],
  "fields": [
    {
      "key": "name",
      "label": "Nombre del rol",
      "required": true
    },
    {
      "key": "key",
      "label": "Clave del rol",
      "required": true
    }
  ]
};
