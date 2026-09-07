import { CertificatesStore } from '../features/certificates/data-access/certificates.store';
import { EnrollmentsStore } from '../features/enrollments/data-access/enrollments.store';
import { CoursesStore } from '../features/courses/data-access/courses.store';
import { StudentsStore } from '../features/students/data-access/students.store';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { EnrollmentRecord } from '../features/enrollments/enrollments.model';
import { Student } from '../features/students/students.model';
import { TrainingCourse } from '../features/courses/courses.model';
import { ApplicationDataCoordinator } from './application-data.coordinator';
import { Subject } from 'rxjs';
import { LiveSyncService } from '../core/realtime/live-sync';
import {
  CourseUpdateEvent,
  EnrollmentStatusEvent,
  GradePostedEvent,
} from '../core/realtime/realtime.model';
import { CertificatesFacade } from '../features/certificates/data-access/certificates.facade';

describe('ApplicationDataCoordinator', () => {
  let service: ApplicationDataCoordinator;
  let students: InstanceType<typeof StudentsStore>;
  let courses: InstanceType<typeof CoursesStore>;
  let enrollments: InstanceType<typeof EnrollmentsStore>;
  let certificates: InstanceType<typeof CertificatesStore>;
  let http: HttpTestingController;
  let enrollmentEvents: Subject<EnrollmentStatusEvent>;
  let gradeEvents: Subject<GradePostedEvent>;

  const student: Student = {
    id: 17,
    registrationNumber: 'TMS-017',
    name: 'API Student',
    gpa: 3.5,
    active: true,
  };
  const studentApiResponse = { ...student, isActive: student.active, active: undefined };

  beforeEach(() => {
    enrollmentEvents = new Subject<EnrollmentStatusEvent>();
    gradeEvents = new Subject<GradePostedEvent>();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: LiveSyncService,
          useValue: {
            enrollmentStatusUpdated$: enrollmentEvents,
            gradePosted$: gradeEvents,
            courseUpdate$: new Subject<CourseUpdateEvent>(),
            watchCourses: vi.fn(),
          },
        },
      ],
    });
    service = TestBed.inject(ApplicationDataCoordinator);
    students = TestBed.inject(StudentsStore);
    courses = TestBed.inject(CoursesStore);
    enrollments = TestBed.inject(EnrollmentsStore);
    certificates = TestBed.inject(CertificatesStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('starts empty and populates students only from the API', () => {
    expect(students.students()).toEqual([]);

    students.loadStudents();
    expect(students.studentLoadState().loading).toBe(true);
    http
      .expectOne(
        (request) =>
          request.url === '/api/v2/students' &&
          request.params.get('page') === '1' &&
          request.params.get('pageSize') === '50',
      )
      .flush([studentApiResponse]);

    expect(students.students()).toEqual([student]);
    expect(students.studentLoadState()).toEqual({ loading: false, loaded: true, error: null });
  });

  it('applies student CRUD only after the backend confirms it', () => {
    const draft = { ...student };
    delete (draft as Partial<Student>).id;

    students.addStudent(draft).subscribe();
    expect(students.students()).toEqual([]);
    const create = http.expectOne('/api/v2/students');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({
      registrationNumber: student.registrationNumber,
      name: student.name,
      gpa: student.gpa,
      isActive: true,
    });
    create.flush(studentApiResponse);
    expect(students.students()).toEqual([student]);

    const updated = { ...student, name: 'Updated by API' };
    students.updateStudent(student.id, { ...draft, name: updated.name }).subscribe();
    expect(students.studentById(student.id)?.name).toBe(student.name);
    const update = http.expectOne(`/api/v2/students/${student.id}`);
    expect(update.request.method).toBe('PUT');
    update.flush({ ...updated, isActive: updated.active, active: undefined });
    expect(students.studentById(student.id)?.name).toBe(updated.name);

    students.deleteStudent(student.id).subscribe();
    expect(students.studentById(student.id)).toBeDefined();
    const remove = http.expectOne(`/api/v2/students/${student.id}`);
    expect(remove.request.method).toBe('DELETE');
    remove.flush(null);
    expect(students.studentById(student.id)).toBeUndefined();
  });

  it('creates courses from the server response', () => {
    const course: TrainingCourse = {
      id: 9,
      code: 'TST-900',
      title: 'Testing Fundamentals',
      capacity: 18,
      enrollmentCount: 0,
      assessments: [],
    };

    courses
      .addCourse({
        code: course.code,
        title: course.title,
        capacity: course.capacity,
      })
      .subscribe();
    expect(courses.courses()).toEqual([]);
    const request = http.expectOne('/api/v2/courses');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      code: course.code,
      title: course.title,
      maxCapacity: course.capacity,
    });
    request.flush({
      id: course.id,
      code: course.code,
      title: course.title,
      maxCapacity: course.capacity,
      enrollmentCount: 0,
    });
    expect(courses.courses()).toEqual([course]);
  });

  it('creates, approves, and grades enrollments through the API', () => {
    const pending: EnrollmentRecord = {
      id: '2001',
      studentId: 17,
      courseId: 9,
      status: 'Pending',
      grade: null,
      enrolledAt: '2026-09-04T12:00:00Z',
    };

    courses.loadCourses();
    http
      .expectOne((request) => request.url === '/api/v1/courses')
      .flush({
        items: [
          {
            id: 9,
            code: 'TST-900',
            title: 'Testing Fundamentals',
            maxCapacity: 18,
            enrollmentCount: 0,
          },
        ],
      });

    enrollments.addEnrollment({ studentId: 17, courseId: 9 }).subscribe();
    const create = http.expectOne('/api/v2/enrollments');
    expect(create.request.body).toEqual({ studentId: 17, courseCode: 'TST-900' });
    create.flush(pending);
    expect(enrollments.enrollments()).toEqual([pending]);

    enrollments.setEnrollmentStatus(pending.id, 'Approved').subscribe();
    expect(enrollments.enrollments()[0].status).toBe('Pending');
    http.expectOne(`/api/v2/enrollments/${pending.id}/approve`).flush(null);
    expect(enrollments.enrollments()[0].status).toBe('Approved');

    const graded = { ...pending, status: 'Approved' as const, grade: 88 };
    enrollments.setGrade(pending.id, 88).subscribe();
    const grade = http.expectOne(`/api/v2/enrollments/${pending.id}/grade`);
    expect(grade.request.method).toBe('PATCH');
    expect(grade.request.body).toEqual({ grade: 88 });
    grade.flush(null);
    expect(enrollments.enrollments()[0]).toEqual(graded);
  });

  it('adds certificates only from the issue response', () => {
    certificates.issueCertificate('2001').subscribe();
    expect(certificates.certificates()).toEqual([]);
    const request = http.expectOne('/api/v1/certificates');
    expect(request.request.body).toEqual({ enrollmentId: '2001' });
    request.flush({
      id: 4,
      serial: 'CERT-00004',
      studentId: 17,
      courseId: 9,
      issuedAt: '2026-09-04T12:30:00Z',
    });
    expect(certificates.certificates()[0].serial).toBe('CERT-00004');
  });

  const enrollment: EnrollmentRecord = {
    id: '2001',
    studentId: 17,
    courseId: 9,
    status: 'Pending',
    grade: null,
    enrolledAt: '2026-09-04T12:00:00Z',
  };
  const course: TrainingCourse = {
    id: 9,
    code: 'TST-900',
    title: 'Testing Fundamentals',
    capacity: 18,
    assessments: [],
  };

  it('shares dashboard data with feature stores and reports aggregate load failures', () => {
    service.loadForRole('Instructor');
    http.expectOne((request) => request.url === '/api/v2/students').flush([studentApiResponse]);
    http.expectOne((request) => request.url === '/api/v1/courses').flush([course]);
    http.expectOne('/api/v2/enrollments').flush([enrollment]);
    http.expectNone('/api/v1/certificates');
    expect(students.students()).toEqual([student]);
    expect(courses.courses()[0].id).toBe(course.id);
    expect(enrollments.enrollments()).toEqual([enrollment]);
    expect(service.dashboardStats().pending).toBe(1);

    service.loadDashboard();
    http.expectOne((request) => request.url === '/api/v1/courses').flush([course]);
    http.expectOne('/api/v2/enrollments').flush([enrollment]);
    http
      .expectOne((request) => request.url === '/api/v2/students')
      .flush({ detail: 'Service unavailable' }, { status: 503, statusText: 'Unavailable' });
    expect(service.dashboardLoadState().loading).toBe(false);
    expect(students.studentLoadState().error).toBeTruthy();
    expect(courses.courseLoadState().error).toBeTruthy();
    expect(enrollments.enrollmentLoadState().error).toBeTruthy();
    expect(students.students()).toEqual([student]);
  });

  it('removes related records only after a student deletion succeeds', () => {
    students.hydrate([student]);
    enrollments.hydrate([enrollment, { ...enrollment, id: '2002', studentId: 18 }]);
    certificates.hydrate([
      { id: 4, serial: 'CERT-4', studentId: 17, courseId: 9, issuedAt: '2026-09-04' },
      { id: 5, serial: 'CERT-5', studentId: 18, courseId: 9, issuedAt: '2026-09-04' },
    ]);
    students.deleteStudent(17).subscribe({ error: () => undefined });
    http.expectOne('/api/v2/students/17').flush({}, { status: 409, statusText: 'Conflict' });
    expect(students.students()).toHaveLength(1);
    expect(enrollments.enrollments()).toHaveLength(2);
    expect(certificates.certificates()).toHaveLength(2);

    students.deleteStudent(17).subscribe();
    http.expectOne('/api/v2/students/17').flush(null);
    expect(students.students()).toEqual([]);
    expect(enrollments.enrollments().map((row) => row.studentId)).toEqual([18]);
    expect(certificates.certificates().map((row) => row.studentId)).toEqual([18]);
  });

  it('projects live grades and statuses into certificate eligibility without a second cache', () => {
    students.hydrate([student]);
    courses.hydrate([course]);
    enrollments.hydrate([enrollment]);
    const facade = TestBed.inject(CertificatesFacade);
    expect(facade.eligibleEnrollments()).toEqual([]);

    enrollmentEvents.next({ id: enrollment.id, status: 'Approved' });
    gradeEvents.next({ courseCode: course.code, studentId: student.id, grade: 88 });
    expect(enrollments.enrollments()[0]).toMatchObject({ status: 'Approved', grade: 88 });
    expect(facade.eligibleEnrollments()[0]).toMatchObject({
      id: enrollment.id,
      studentName: student.name,
      grade: 88,
    });

    facade.issueCertificate(enrollment.id).subscribe();
    http.expectOne('/api/v1/certificates').flush({
      id: 4,
      serial: 'CERT-4',
      studentId: 17,
      courseId: 9,
      issuedAt: '2026-09-04',
    });
    expect(facade.eligibleEnrollments()).toEqual([]);
    expect(facade.certificateRows()[0].courseTitle).toBe(course.title);
  });

  it('preserves the last confirmed enrollment status when a mutation fails', () => {
    enrollments.hydrate([enrollment]);
    enrollments
      .setEnrollmentStatus(enrollment.id, 'Approved')
      .subscribe({ error: () => undefined });
    http
      .expectOne('/api/v2/enrollments/2001/approve')
      .flush({}, { status: 409, statusText: 'Conflict' });
    expect(enrollments.enrollments()[0].status).toBe('Pending');
  });
});
