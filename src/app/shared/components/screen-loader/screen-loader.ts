import {Component,input} from '@angular/core';
@Component({selector:'tp-screen-loader',templateUrl:'./screen-loader.html',styleUrl:'./screen-loader.scss'})
export class ScreenLoader {title=input('Un momento, estamos preparando todo.');message=input('Preparando tu siguiente paso…');}
