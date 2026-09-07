import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { EnrollmentRecord } from '../../../enrollments/enrollments.model';
import { Student } from '../../../students/students.model';
import { CoursesFacade } from '../../data-access/courses.facade';

interface EnrolledStudentRow {
  enrollment: EnrollmentRecord;
  student: Student;
}

@Component({
  selector: 'tms-course-detail',
  standalone: true,
  templateUrl: './course-detail.html',
  styleUrl: './course-detail.scss',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseDetailComponent {
  protected readonly data = inject(CoursesFacade);

  readonly id = input.required<string>();

  protected readonly course = computed(() => {
    const courseId = Number(this.id());
    return Number.isInteger(courseId) ? this.data.courseById(courseId) : undefined;
  });

  protected readonly enrolledStudents = computed<readonly EnrolledStudentRow[]>(() => {
    const course = this.course();
    if (!course) {
      return [];
    }

    const rows: EnrolledStudentRow[] = [];
    for (const enrollment of this.data.enrollments()) {
      if (enrollment.courseId !== course.id || enrollment.status === 'Rejected') {
        continue;
      }

      const student = this.data.studentById(enrollment.studentId);
      if (student) {
        rows.push({ enrollment, student });
      }
    }
    return rows;
  });

  protected readonly enrollmentCount = computed(() => {
    const course = this.course();
    return course ? this.data.enrollmentCount(course.id) : 0;
  });

  protected readonly capacityPercent = computed(() => {
    const course = this.course();
    if (!course || course.capacity <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((this.enrollmentCount() / course.capacity) * 100));
  });

  protected readonly spacesRemaining = computed(() => {
    const course = this.course();
    return course ? Math.max(0, course.capacity - this.enrollmentCount()) : 0;
  });
}
