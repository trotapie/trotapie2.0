import type {Room} from './room';

export interface BedType {id:number;nombre:string;}
export interface RoomType {id:number;nombre_habitacion:string;capacidad_maxima:number|null;camas:BedType[];}

export function availableRoomTypes(room:Room,types:RoomType[]):RoomType[]{
  return types.filter(type=>Number(type.capacidad_maxima)>=room.adults+room.children);
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
