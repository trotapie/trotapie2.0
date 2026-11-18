import type {Room} from './room';

export interface BedType {id:number;nombre:string;}
export interface RoomType {id:number;nombre_habitacion:string;capacidad_maxima:number|null;camas:BedType[];}

export function roomTypeHasCapacity(type:Pick<RoomType,'capacidad_maxima'>,people:number):boolean {
  const capacity=Number(type.capacidad_maxima);
  return Number.isSafeInteger(capacity)&&capacity>=Math.max(1,people);
}

export function availableRoomTypes(room:Room,types:RoomType[]):RoomType[]{
  return types.filter(type=>roomTypeHasCapacity(type,room.adults+room.children));
}

export function tariffRoomTypeOptions(
  types:readonly RoomType[],people:number,selectedId:number|null|undefined,
  historicalTypes:readonly Pick<RoomType,'id'|'nombre_habitacion'>[],
): {value:number;label:string;disabled?:boolean}[] {
  const options:{value:number;label:string;disabled?:boolean}[]=types.filter(type=>roomTypeHasCapacity(type,people))
    .map(type=>({value:type.id,label:type.nombre_habitacion}));
  if(selectedId!=null&&!options.some(option=>option.value===Number(selectedId))){
    const id=Number(selectedId);
    const type=types.find(type=>type.id===id)??historicalTypes.find(type=>Number(type.id)===id);
    options.push({value:id,label:`${type?.nombre_habitacion||`Habitación #${id}`} (selección guardada)`,disabled:true});
  }
  return options;
}

export function selectRoomType(room:Room,id:number|null,types:RoomType[]):Room {
  const type=availableRoomTypes(room,types).find(type=>type.id===id);
  return {...room,roomTypeId:type?.id??null,roomTypeName:type?.nombre_habitacion??'',bedTypeId:null,bedTypeName:''};
}

export function reconcileRoom(room:Room,types:RoomType[]):Room {
  const type=availableRoomTypes(room,types).find(type=>type.id===room.roomTypeId);
  if(!type)return selectRoomType(room,null,types);
  const bed=type.camas.find(bed=>bed.id===room.bedTypeId);
  return {...room,roomTypeName:type.nombre_habitacion,bedTypeId:bed?.id??null,bedTypeName:bed?.nombre??''};
}

export function validRoomConfiguration(room:Room,types:RoomType[]):boolean {
  const type=availableRoomTypes(room,types).find(type=>type.id===room.roomTypeId);
  return !!type&&(room.bedTypeId==null||type.camas.some(bed=>bed.id===room.bedTypeId));
}
