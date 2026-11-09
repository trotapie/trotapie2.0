import {Component,input,output} from '@angular/core';import {Icon} from '../icon/icon';import {Button} from '../button/button';
import {ScreenLoader} from '../screen-loader/screen-loader';
import {UiTextPipe} from '../../pipes/ui-text.pipe';
@Component({selector:'tp-state',imports:[UiTextPipe,ScreenLoader,Icon,Button],templateUrl: './state.html', styleUrl: './state.scss'})
export class State {mode=input('empty');title=input('');message=input('');retry=output<void>();}
