import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-steps',
  templateUrl: './steps.component.html',
  styleUrls: ['./steps.component.scss'],
})
export class StepsComponent implements OnInit {

  @Input() steps: number = null;
  @Input() connected = true;
  @Input() fetching = false;

  @Output() update = new EventEmitter<boolean>();

  constructor() { }

  ngOnInit() {}

  sync() {
    console.log(`StepsComponent sync() clicked`);
    this.update.emit(true);
  }

}
