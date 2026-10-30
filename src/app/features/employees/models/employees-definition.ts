import type {ResourceDefinition} from '../../../shared/models/resource-definition';
export const employeesDefinition:ResourceDefinition = {
  "kind": "empleados",
  "title": "Equipo",
  "description": "Un gran viaje empieza con un gran equipo. Gestiona información y acceso.",
  "singular": "empleado",
  "icon": "people",
  "permission": "empleados.manage",
  "columns": [
    {"key":"asesor_cotizacion_label","label":"Asesor de cotizaciones"},
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
      "key": "mostrar_en_cotizaciones",
      "label": "Mostrar como asesor en cotizaciones",
      "type": "checkbox",
      "hint": "Disponible en cotizaciones públicas e internas solo mientras el empleado esté activo. No cambia su acceso al sistema."
    },
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
