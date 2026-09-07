import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { CourseService } from './course.service';

describe('CourseService', () => {
  let service: CourseService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CourseService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('loads and normalizes the paged v1 course response', () => {
    let courses: ReturnType<CourseService['getAll']> extends import('rxjs').Observable<infer T>
      ? T
      : never;
    service.getAll().subscribe((value) => (courses = value));

    const request = http.expectOne(
      (candidate) =>
        candidate.url === '/api/v1/courses' &&
        candidate.params.get('page') === '1' &&
        candidate.params.get('pageSize') === '50',
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      items: [
        { id: 42, code: 'CSE-401', title: 'ASP.NET Core', maxCapacity: 30, enrollmentCount: 28 },
      ],
    });
    expect(courses!).toEqual([
      {
        id: 42,
        code: 'CSE-401',
        title: 'ASP.NET Core',
        capacity: 30,
        enrollmentCount: 28,
        assessments: [],
      },
    ]);
  });
});
