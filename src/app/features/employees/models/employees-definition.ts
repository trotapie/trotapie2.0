import type {ResourceDefinition} from '../../../shared/models/resource-definition';
export const employeesDefinition:ResourceDefinition = {
  "kind": "empleados",
  "title": "Equipo",
  "description": "Un gran viaje empieza con un gran equipo. Gestiona información y acceso.",
  "singular": "empleado",
  "icon": "people",
  "permission": "empleados.manage",
  "columns": [
    {"key":"cargo_label","label":"Cargo"},
    {"key":"rol_label","label":"Rol"},
    {
      "key": "email",
      "label": "Correo"
    },
    {
      "key": "acceso_label",
      "label": "Acceso"
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
      "key": "email",
      "label": "Correo",
      "type": "email",
    },
    {
      "key": "telefono",
      "label": "Teléfono",
      "type": "tel"
    },
    {
      "key": "estatus_id",
      "label": "Estado del empleado",
      "type": "select",
      "ref": "employee-status",
      "only": "edit"
    }
  ]
};
