export interface Option {value:string|number|null;label:string;}
export interface FieldDefinition {key:string;label:string;type?:'text'|'email'|'tel'|'number'|'url'|'textarea'|'checkbox'|'select'|'multiselect';required?:boolean;min?:number;ref?:string;options?:Option[];hint?:string;imagePreview?:boolean;textPreview?:boolean;only?:'create'|'edit';visibleWhen?:{key:string;value:string|number};}
export interface TableColumn {key:string;label:string;detailsKey?:string;}
export interface ResourceDefinition {kind:string;title:string;description:string;singular:string;icon:string;permission:string;fields:FieldDefinition[];columns:TableColumn[];visual?:boolean;}
