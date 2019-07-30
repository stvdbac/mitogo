import { Component, OnInit, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { dateToEpoch, epochToDate } from 'src/app/services/date.function';

const noop = () => { };

function epochToDateStr(n: number): string {
  function leadingZero(num: number): string {
    if (num <= 9) {
      return '0' + num;
    }
    return '' + num;
  }
  if (n) {
    const date = epochToDate(n);
    const d = `${leadingZero(date.getDate())}/${leadingZero(date.getMonth() + 1)}/${date.getFullYear()}`;
    return d;
  } else {
    return null;
  }
}

function epochToDayMonthStr(n: number): string {
  const weekdays = new Array(7);
  weekdays[0] = 'Sunday';
  weekdays[1] = 'Monday';
  weekdays[2] = 'Tuesday';
  weekdays[3] = 'Wednesday';
  weekdays[4] = 'Thursday';
  weekdays[5] = 'Friday';
  weekdays[6] = 'Saturday';
  const month = new Array();
  month[0] = 'January';
  month[1] = 'February';
  month[2] = 'March';
  month[3] = 'April';
  month[4] = 'May';
  month[5] = 'June';
  month[6] = 'July';
  month[7] = 'August';
  month[8] = 'September';
  month[9] = 'October';
  month[10] = 'November';
  month[11] = 'December';
  if (n) {
    const date = epochToDate(n);
    const d = `${weekdays[date.getDay()]} ${date.getDate()} ${month[date.getMonth()]}`;
    return d;
  } else {
    return null;
  }
}

@Component({
  selector: 'app-dateselection',
  templateUrl: './dateselection.component.html',
  styleUrls: ['./dateselection.component.scss'],
  providers: [
  {
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => DateselectionComponent),
    multi: true
  }]
})
export class DateselectionComponent implements OnInit, ControlValueAccessor {
  readonly name = 'DateselectionComponent';
  // The internal data model
  private innerValue: number = dateToEpoch();
  // view
  isToday = true;
  disabled = false;
  dateString = '';

  // Placeholders for the callbacks which are later providesd
  // by the Control Value Accessor
  private onTouchedCallback: () => void = noop;
  private onChangeCallback: (_: any) => void = noop;
  constructor() {
    this.internalUpdate();
  }

  ngOnInit() { }


  nextDay() {
    if (!this.isToday) {
      this.value = this.value + 1;
    }
  }

  prevDay() {
    this.value = this.value - 1;
  }

  resetDate() {
    this.value = dateToEpoch();
  }

  internalUpdate() {
    this.isToday = this.value === dateToEpoch();
    this.dateString = epochToDayMonthStr(this.value);
  }

  // get accessor
  get value(): any {
    return this.innerValue;
  }

  // set accessor including call the onchange callback
  set value(v: any) {
    console.log(`${this.name} set value(${v})`);
    if (v !== this.innerValue) {
      this.innerValue = v;
      this.internalUpdate();
      this.onChangeCallback(v);
    }
  }

  // Set touched on blur
  onBlur() {
    this.onTouchedCallback();
  }

  // From ControlValueAccessor interface
  writeValue(value: any) {
    if (value !== this.innerValue) {
      if (value <= dateToEpoch()) {
        this.innerValue = value;
        this.internalUpdate();
      } else {
        this.innerValue = dateToEpoch();
        this.internalUpdate();
      }
    }
  }

  // From ControlValueAccessor interface
  registerOnChange(fn: any) {
    this.onChangeCallback = fn;
  }

  // From ControlValueAccessor interface
  registerOnTouched(fn: any) {
    this.onTouchedCallback = fn;
  }

  // From ControlValueAccessor interface
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}


