import {Component,input} from '@angular/core';
@Component({selector:'tp-field',templateUrl: './field.html', styleUrl: './field.scss'})
export class Field {label=input('');forId=input('');required=input(false);hint=input('');error=input('');}
