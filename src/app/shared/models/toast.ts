export type TpToastVariant='success'|'error'|'warning'|'info';
export interface TpToastData {title:string;message:string;variant:TpToastVariant;duration?:number;}
export interface ToastNotification extends TpToastData {id:number;}
