import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnrollmentListComponent } from './enrollment-list';

describe('EnrollmentListComponent', () => {
  let component: EnrollmentListComponent;
  let fixture: ComponentFixture<EnrollmentListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnrollmentListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EnrollmentListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
