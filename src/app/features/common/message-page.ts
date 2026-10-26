import {Component,inject} from '@angular/core';import {ActivatedRoute,RouterLink} from '@angular/router';import {Button} from '../../shared/components/button/button';
@Component({imports:[Button,RouterLink],templateUrl: './message-page.html', styleUrl: './message-page.scss'})
export class MessagePage {data=inject(ActivatedRoute).snapshot.data;}
