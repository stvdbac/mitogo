import { TestBed } from '@angular/core/testing';

import { GooglefitService } from './googlefit.service';

describe('GooglefitService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: GooglefitService = TestBed.get(GooglefitService);
    expect(service).toBeTruthy();
  });
});
