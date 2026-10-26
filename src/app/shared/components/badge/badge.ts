import {Component,input,computed} from '@angular/core';
@Component({selector:'tp-badge',templateUrl: './badge.html', styleUrl: './badge.scss'})
export class Badge {label=input('');tone=computed(()=>{const s=this.label().toLowerCase();return /cancel|elimin|inactiv/.test(s)?'danger':/pend|nuev/.test(s)?'warning':/cotiz|confirm|^activo/.test(s)?'success':'neutral';});}
