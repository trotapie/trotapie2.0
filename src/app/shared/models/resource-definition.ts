export interface Option {value:string|number|null;label:string;}
export interface FieldDefinition {key:string;label:string;type?:'text'|'email'|'tel'|'number'|'url'|'textarea'|'checkbox'|'select';required?:boolean;min?:number;ref?:string;options?:Option[];hint?:string;imagePreview?:boolean;only?:'create'|'edit';}
export interface ResourceDefinition {kind:string;title:string;description:string;singular:string;icon:string;permission:string;fields:FieldDefinition[];columns:{key:string;label:string}[];visual?:boolean;}
