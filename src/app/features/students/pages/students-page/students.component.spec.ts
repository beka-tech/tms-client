import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentsComponent } from './students.component';

describe('StudentsComponent', () => {
  let fixture: ComponentFixture<StudentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
