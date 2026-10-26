import {Component} from '@angular/core';
import {ScreenLoader} from '../screen-loader/screen-loader';
import {MotionDirective} from '../../directives/motion.directive';
@Component({selector:'tp-route-loader',imports:[ScreenLoader,MotionDirective],templateUrl:'./route-loader.html',styleUrl:'./route-loader.scss'})
export class RouteLoader {}
