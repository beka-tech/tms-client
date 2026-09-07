import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import { DashboardSummary } from '../dashboard.model';
import { EnrollmentRecord } from '../../enrollments/enrollments.model';
import { Student } from '../../students/students.model';
import { TrainingCourse } from '../../courses/courses.model';
import { CourseService } from '../../courses/data-access/course.service';
import { EnrollmentService } from '../../enrollments/data-access/enrollment';
import { StudentService } from '../../students/data-access/student.service';

export interface DashboardData {
  students: Student[];
  courses: TrainingCourse[];
  enrollments: EnrollmentRecord[];
  summary: DashboardSummary;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly students = inject(StudentService);
  private readonly courses = inject(CourseService);
  private readonly enrollments = inject(EnrollmentService);

  getData(): Observable<DashboardData> {
    return forkJoin({
      students: this.students.getAll(),
      courses: this.courses.getAll(),
      enrollments: this.enrollments.getAll(),
    }).pipe(
      map((data) => ({
        ...data,
        summary: {
          students: data.students.length,
          activeStudents: data.students.filter(({ active }) => active).length,
          courses: data.courses.length,
          enrolled: data.enrollments.filter(
            ({ status }) => status === 'Approved' || status === 'Completed',
          ).length,
          pending: data.enrollments.filter(({ status }) => status === 'Pending').length,
        },
      })),
    );
  }
}
