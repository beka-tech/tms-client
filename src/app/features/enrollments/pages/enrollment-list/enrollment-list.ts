import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { EnrollmentRecord, EnrollmentStatus } from '../../enrollments.model';
import { Student } from '../../../students/students.model';
import { TrainingCourse } from '../../../courses/courses.model';
import { apiErrorMessage } from '../../../../core/notifications/global-message.service';
import { EnrollmentsFacade } from '../../data-access/enrollments.facade';

type EnrollmentFilter = 'All' | EnrollmentStatus;

interface EnrollmentRow extends EnrollmentRecord {
  student?: Student;
  course?: TrainingCourse;
}

@Component({
  selector: 'tms-enrollment-list',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule],
  templateUrl: './enrollment-list.html',
  styleUrl: './enrollment-list.scss',
})
export class EnrollmentListComponent {
  private readonly formBuilder = inject(FormBuilder);
  protected readonly data = inject(EnrollmentsFacade);

  protected readonly searchTerm = signal('');
  protected readonly activeFilter = signal<EnrollmentFilter>('All');
  protected readonly enrollDialogOpen = signal(false);
  protected readonly gradeEnrollment = signal<EnrollmentRow | null>(null);
  protected readonly viewedEnrollment = signal<EnrollmentRow | null>(null);
  protected readonly gradePreview = signal(0);
  protected readonly feedback = signal<{ kind: 'success' | 'error'; message: string } | null>(null);
  protected readonly operationPending = signal(false);

  protected readonly enrollForm = this.formBuilder.nonNullable.group({
    studentId: [0, [Validators.required, Validators.min(1)]],
    courseId: [0, [Validators.required, Validators.min(1)]],
  });

  protected readonly gradeForm = this.formBuilder.nonNullable.group({
    grade: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
  });

  protected readonly rows = computed<EnrollmentRow[]>(() =>
    this.data.enrollments().map((row) => ({
      ...row,
      student: this.data.studentById(row.studentId),
      course: this.data.courseById(row.courseId),
    })),
  );

  protected readonly filteredRows = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const status = this.activeFilter();
    return this.rows().filter((row) => {
      const matchesStatus = status === 'All' || row.status === status;
      const matchesSearch =
        !query ||
        row.student?.name.toLowerCase().includes(query) ||
        row.course?.title.toLowerCase().includes(query) ||
        row.course?.code.toLowerCase().includes(query) ||
        row.id.toLowerCase().includes(query);
      return matchesStatus && Boolean(matchesSearch);
    });
  });

  protected count(status: EnrollmentFilter): number {
    return status === 'All'
      ? this.data.enrollments().length
      : this.data.enrollments().filter((row) => row.status === status).length;
  }

  protected setSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected openEnrollDialog(): void {
    this.feedback.set(null);
    this.enrollForm.reset({ studentId: 0, courseId: 0 });
    this.enrollDialogOpen.set(true);
  }

  protected closeEnrollDialog(): void {
    this.enrollDialogOpen.set(false);
  }

  protected submitEnrollment(): void {
    if (this.enrollForm.invalid) {
      this.enrollForm.markAllAsTouched();
      return;
    }
    this.feedback.set(null);
    this.operationPending.set(true);
    this.data
      .addEnrollment(this.enrollForm.getRawValue())
      .pipe(finalize(() => this.operationPending.set(false)))
      .subscribe({
        next: () => {
          this.enrollDialogOpen.set(false);
          this.feedback.set({
            kind: 'success',
            message: 'Enrollment added and marked as pending.',
          });
          this.activeFilter.set('All');
        },
        error: (error: unknown) =>
          this.feedback.set({ kind: 'error', message: apiErrorMessage(error) }),
      });
  }

  protected updateStatus(row: EnrollmentRow, status: EnrollmentStatus): void {
    this.operationPending.set(true);
    this.data
      .setEnrollmentStatus(row.id, status)
      .pipe(finalize(() => this.operationPending.set(false)))
      .subscribe({
        next: () =>
          this.feedback.set({
            kind: 'success',
            message: `${row.student?.name ?? 'Enrollment'} was ${status.toLowerCase()}.`,
          }),
        error: (error: unknown) =>
          this.feedback.set({ kind: 'error', message: apiErrorMessage(error) }),
      });
  }

  protected openGradeDialog(row: EnrollmentRow): void {
    const value = row.grade ?? 0;
    this.gradeForm.reset({ grade: value });
    this.gradePreview.set(value);
    this.gradeEnrollment.set(row);
  }

  protected setGradePreview(event: Event): void {
    this.gradePreview.set(Number((event.target as HTMLInputElement).value));
  }

  protected saveGrade(): void {
    const row = this.gradeEnrollment();
    if (!row || this.gradeForm.invalid) {
      this.gradeForm.markAllAsTouched();
      return;
    }
    this.operationPending.set(true);
    this.data
      .setGrade(row.id, this.gradeForm.getRawValue().grade)
      .pipe(finalize(() => this.operationPending.set(false)))
      .subscribe({
        next: () => {
          this.gradeEnrollment.set(null);
          this.feedback.set({
            kind: 'success',
            message: `Grade saved for ${row.student?.name ?? 'student'}.`,
          });
        },
        error: (error: unknown) =>
          this.feedback.set({ kind: 'error', message: apiErrorMessage(error) }),
      });
  }

  protected resultLabel(grade: number | null): string {
    if (grade === null) return 'Not graded';
    if (grade >= 85) return 'Distinction';
    if (grade >= 70) return 'Merit';
    if (grade >= 50) return 'Pass';
    return 'Not passed';
  }

  protected initials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();
  }
}
