import {Component,input,output} from '@angular/core';import {Icon} from '../icon/icon';import {Button} from '../button/button';
import {ScreenLoader} from '../screen-loader/screen-loader';
@Component({selector:'tp-state',imports:[ScreenLoader,Icon,Button],templateUrl: './state.html', styleUrl: './state.scss'})
export class State {mode=input('empty');title=input('');message=input('');retry=output<void>();}
