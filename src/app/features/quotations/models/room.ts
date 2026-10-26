export interface Room { adults:number; children:number; childAges:(number|null)[]; }
export function nights(start:string,end:string){const diff=Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z');return Number.isFinite(diff)&&diff>0?Math.round(diff/86400000):0;}
export function validRooms(rooms:Room[]){return rooms.length>0&&rooms.every(r=>r.adults>=1&&r.children>=0&&r.children===r.childAges.length&&r.childAges.every(age=>age!==null&&Number.isInteger(age)&&age>=0&&age<=17));}
export function roomDescription(rooms:Room[]){const text=rooms.map((r,i)=>`Habitacion ${i+1}: ${r.adults} ${r.adults===1?'adulto':'adultos'}${r.children?' · '+r.children+' menores · edades: '+r.childAges.join(', '):''}`).join('\n');return {es:text,traduccion:text};}
