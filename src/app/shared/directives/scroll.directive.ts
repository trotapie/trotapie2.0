import {Directive} from '@angular/core';
@Directive({selector:'[customScrollbarThumb]',host:{'style.scrollbar-width':'thin','style.scrollbar-color':'var(--line) transparent','style.overscroll-behavior':'contain','style.scrollbar-gutter':'stable'}})
export class CustomScrollbarThumbDirective {}
