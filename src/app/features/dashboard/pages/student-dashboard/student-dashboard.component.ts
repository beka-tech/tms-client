import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApplicationDataCoordinator } from '../../../../application/application-data.coordinator';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './student-dashboard.component.html',
  styleUrl: './student-dashboard.component.scss',
})
export class StudentDashboardComponent {
  protected readonly data = inject(ApplicationDataCoordinator);

  protected readonly recentEnrollments = computed(() =>
    [...this.data.enrollments()]
      .sort((a, b) => Date.parse(b.enrolledAt) - Date.parse(a.enrolledAt))
      .slice(0, 5)
      .map((enrollment) => ({
        ...enrollment,
        student: this.data.studentById(enrollment.studentId),
        course: this.data.courseById(enrollment.courseId),
      })),
  );

  protected initials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();
  }
}
