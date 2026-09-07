import { Injectable, inject } from '@angular/core';
import { EnrollmentsStore } from './enrollments.store';
import { CoursesStore } from '../../courses/data-access/courses.store';
import { StudentsStore } from '../../students/data-access/students.store';

@Injectable({ providedIn: 'root' })
export class EnrollmentsFacade {
  private readonly enrollmentsStore = inject(EnrollmentsStore);
  readonly enrollments = this.enrollmentsStore.enrollments;
  readonly enrollmentLoadState = this.enrollmentsStore.enrollmentLoadState;
  readonly loadEnrollments = this.enrollmentsStore.loadEnrollments;
  readonly addEnrollment = this.enrollmentsStore.addEnrollment;
  readonly setEnrollmentStatus = this.enrollmentsStore.setEnrollmentStatus;
  readonly setGrade = this.enrollmentsStore.setGrade;
  readonly enrollmentCount = this.enrollmentsStore.enrollmentCount;
  private readonly coursesStore = inject(CoursesStore);
  readonly courses = this.coursesStore.courses;
  readonly courseById = this.coursesStore.courseById;
  private readonly studentsStore = inject(StudentsStore);
  readonly students = this.studentsStore.students;
  readonly studentById = this.studentsStore.studentById;
}
