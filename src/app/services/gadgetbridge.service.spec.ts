import { TestBed } from '@angular/core/testing';

import { GadgetbridgeService } from './gadgetbridge.service';

describe('GadgetbridgeService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: GadgetbridgeService = TestBed.get(GadgetbridgeService);
    expect(service).toBeTruthy();
  });
});
