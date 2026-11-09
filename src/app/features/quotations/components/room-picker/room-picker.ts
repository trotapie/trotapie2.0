import {Component,model,input,inject,computed} from '@angular/core';
import {LanguageService} from '../../../../core/services/language.service';
import {FormsModule} from '@angular/forms';
import {TpSelectSearchComponent} from '../../../../shared/components/tp-select-search/tp-select-search.component';
import {Button} from '../../../../shared/components/button/button';
import {Room} from '../../models/room';
import {RoomType,availableRoomTypes,reconcileRoom,selectRoomType} from '../../models/room-configuration';

@Component({selector:'tp-room-picker',imports:[FormsModule,TpSelectSearchComponent,Button],templateUrl:'./room-picker.html',styleUrl:'./room-picker.scss'})
export class RoomPicker {
  private language=inject(LanguageService);
  text(es:string,params:Record<string,string|number>={}){return this.language.formatText(es,params);}
  rooms=model<Room[]>([{adults:2,children:0,childAges:[]}]);
  roomTypes=input<RoomType[]>([]);
  showConfigurationHints=input(false);
  maxRooms=input(8);
  maxPeoplePerRoom=input(8);
  adultOptions(room?:Room){return Array.from({length:Math.max(0,this.maxPeoplePerRoom()-(room?.children??0))},(_,i)=>i+1).map(value=>({value,label:this.text(value===1?'{count} adulto':'{count} adultos',{count:value})}));}
  childOptions(room?:Room){return Array.from({length:Math.max(0,this.maxPeoplePerRoom()-(room?.adults??1)+1)},(_,value)=>({value,label:this.text(value===1?'{count} menor':'{count} menores',{count:value})}));}
  ageOptions=computed(()=>Array.from({length:18},(_,value)=>({value,label:this.text(value===1?'{count} año':'{count} años',{count:value})})));
  typeOptions(room:Room){return availableRoomTypes(room,this.roomTypes()).map(type=>({value:type.id,label:type.nombre_habitacion}));}
  bedOptions(room:Room){return (this.roomTypes().find(type=>type.id===room.roomTypeId)?.camas??[]).map(bed=>({value:bed.id,label:bed.nombre}));}
  update(i:number,key:'adults'|'children',value:number){
    const room=this.rooms()[i];
    const count=Number(value);
    if(!room||!Number.isInteger(count)||count<(key==='adults'?1:0)||count+(key==='adults'?room.children:room.adults)>this.maxPeoplePerRoom())return;
    this.rooms.update(rows=>rows.map((room,j)=>i===j?reconcileRoom({...room,[key]:Number(value),childAges:key==='children'?Array.from({length:Number(value)},(_,k)=>room.childAges[k]??null):room.childAges},this.roomTypes()):room));
  }
  selectType(i:number,value:number|null){this.rooms.update(rows=>rows.map((room,j)=>i===j?selectRoomType(room,value===null?null:Number(value),this.roomTypes()):room));}
  selectBed(i:number,value:number|null){
    this.rooms.update(rows=>rows.map((room,j)=>{
      if(i!==j)return room;
      const bed=this.bedOptions(room).find(bed=>bed.value===Number(value));
      return {...room,bedTypeId:bed?.value??null,bedTypeName:bed?.label??''};
    }));
  }
  age(i:number,c:number,value:number|null){this.rooms.update(rows=>rows.map((room,j)=>i===j?{...room,childAges:room.childAges.map((age,k)=>k===c?value:age)}:room));}
  add(){if(this.rooms().length<this.maxRooms())this.rooms.update(rows=>[...rows,{adults:Math.min(2,this.maxPeoplePerRoom()),children:0,childAges:[]}]);}
  remove(i:number){if(this.rooms().length>1)this.rooms.update(rows=>rows.filter((_,j)=>i!==j));}
}
