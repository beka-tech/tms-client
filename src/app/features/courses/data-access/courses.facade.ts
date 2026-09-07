import { Injectable, inject } from '@angular/core';
import { CoursesStore } from './courses.store';
import { EnrollmentsStore } from '../../enrollments/data-access/enrollments.store';
import { StudentsStore } from '../../students/data-access/students.store';

@Injectable({ providedIn: 'root' })
export class CoursesFacade {
  private readonly coursesStore = inject(CoursesStore);
  readonly courses = this.coursesStore.courses;
  readonly courseLoadState = this.coursesStore.courseLoadState;
  readonly loadCourses = this.coursesStore.loadCourses;
  readonly courseById = this.coursesStore.courseById;
  readonly addCourse = this.coursesStore.addCourse;
  private readonly enrollmentsStore = inject(EnrollmentsStore);
  readonly enrollments = this.enrollmentsStore.enrollments;
  readonly enrollmentCount = this.enrollmentsStore.enrollmentCount;
  private readonly studentsStore = inject(StudentsStore);
  readonly studentById = this.studentsStore.studentById;
}
