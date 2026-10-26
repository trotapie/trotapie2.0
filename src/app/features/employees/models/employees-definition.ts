import type {ResourceDefinition} from '../../../shared/models/resource-definition';
export const employeesDefinition:ResourceDefinition = {
  "kind": "empleados",
  "title": "Equipo",
  "description": "Un gran viaje empieza con un gran equipo. Gestiona información y acceso.",
  "singular": "empleado",
  "icon": "people",
  "permission": "empleados.manage",
  "columns": [
    {
      "key": "email",
      "label": "Correo"
    },
    {
      "key": "telefono",
      "label": "Teléfono"
    }
  ],
  "fields": [
    {
      "key": "nombre",
      "label": "Nombre completo",
      "required": true
    },
    {
      "key": "cargo_id",
      "label": "Cargo",
      "type": "select",
      "ref": "company-roles"
    },
    {
      "key": "telefono",
      "label": "Teléfono",
      "type": "tel"
    },
    {
      "key": "estatus_id",
      "label": "Estado de acceso",
      "type": "select",
      "ref": "employee-status",
      "only": "edit"
    }
  ]
};
