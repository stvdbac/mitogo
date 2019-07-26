import { Injectable } from '@angular/core';
import { GadgetbridgeService } from './gadgetbridge.service';

@Injectable({
  providedIn: 'root'
})
export class WeekdataService {

  constructor(private gadgetbridge: GadgetbridgeService) { }

  
}
