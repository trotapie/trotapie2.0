import {Component,input} from '@angular/core';
import {UiTextPipe} from '../../pipes/ui-text.pipe';
@Component({selector:'tp-field',imports:[UiTextPipe],templateUrl: './field.html', styleUrl: './field.scss'})
export class Field {label=input('');forId=input('');required=input(false);hint=input('');error=input('');}
