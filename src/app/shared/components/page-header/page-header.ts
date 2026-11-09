import {Component,input,contentChildren,computed} from '@angular/core';
import {Button} from '../button/button';
import {BackButton} from '../back-button/back-button';
import {UiTextPipe} from '../../pipes/ui-text.pipe';
@Component({selector:'tp-page-header',imports:[UiTextPipe,BackButton],templateUrl: './page-header.html', styleUrl: './page-header.scss'})
export class PageHeader {
 customTitle=input(false);
 title=input('');description=input('');eyebrow=input('Trotapie / Administración');
 backTo=input('');
 showBack=input(true);
 private actions=contentChildren(Button,{descendants:true});
 hasBack=computed(()=>this.actions().some(action=>action.icon()==='left'));
}
