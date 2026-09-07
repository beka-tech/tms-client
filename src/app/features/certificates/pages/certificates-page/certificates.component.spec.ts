import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CertificatesComponent } from './certificates.component';

describe('CertificatesComponent', () => {
  let fixture: ComponentFixture<CertificatesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CertificatesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CertificatesComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
