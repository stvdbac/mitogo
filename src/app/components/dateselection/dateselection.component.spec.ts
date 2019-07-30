import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DateselectionComponent } from './dateselection.component';

describe('DateselectionComponent', () => {
  let component: DateselectionComponent;
  let fixture: ComponentFixture<DateselectionComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DateselectionComponent ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DateselectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
