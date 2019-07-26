import { TestBed } from '@angular/core/testing';

import { WeekdataService } from './weekdata.service';

describe('WeekdataService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: WeekdataService = TestBed.get(WeekdataService);
    expect(service).toBeTruthy();
  });
});
