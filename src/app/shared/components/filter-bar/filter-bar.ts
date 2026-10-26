import {Component,input,output} from '@angular/core';import {FormsModule} from '@angular/forms';
import {TpSearchInputComponent} from '../tp-search-input/tp-search-input.component';
@Component({selector:'tp-filter-bar',imports:[FormsModule,TpSearchInputComponent],templateUrl: './filter-bar.html', styleUrl: './filter-bar.scss'})
export class FilterBar {search=input('');placeholder=input('Buscar por nombre…');searchChanged=output<string>();}
