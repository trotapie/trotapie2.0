import {Component,Input} from '@angular/core';
import {Badge} from '../badge/badge';
import {Estatus} from './estatus.enum';
@Component({selector:'app-status-badge',imports:[Badge],templateUrl:'./estatus.component.html',styleUrl:'./estatus.component.scss'})
export class EstatusComponent { @Input() status:Estatus='Nuevo';get statusLabel(){return String(this.status??'').trim();} }
