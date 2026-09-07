import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { UserRole } from '../core/auth/auth.model';

import { DashboardService } from '../features/dashboard/data-access/dashboard.service';

import { apiErrorMessage } from '../core/notifications/global-message.service';
import { LiveSyncService } from '../core/realtime/live-sync';

import { ResourceLoadState, IDLE_LOAD_STATE } from '../shared/data-access/resource-load-state';
import { StudentsStore } from '../features/students/data-access/students.store';
import { CoursesStore } from '../features/courses/data-access/courses.store';
import { EnrollmentsStore } from '../features/enrollments/data-access/enrollments.store';
import { CertificatesStore } from '../features/certificates/data-access/certificates.store';

@Injectable({ providedIn: 'root' })
export class ApplicationDataCoordinator {
  private readonly destroyRef = inject(DestroyRef);
  private readonly dashboardApi = inject(DashboardService);
  private readonly liveSync = inject(LiveSyncService);
  private readonly studentStore = inject(StudentsStore);
  readonly students = this.studentStore.students;
  readonly studentById = this.studentStore.studentById;
  private readonly courseStore = inject(CoursesStore);
  readonly courses = this.courseStore.courses;
  readonly courseById = this.courseStore.courseById;
  private readonly enrollmentStore = inject(EnrollmentsStore);
  readonly enrollments = this.enrollmentStore.enrollments;
  readonly enrollmentLoadState = this.enrollmentStore.enrollmentLoadState;
  readonly loadEnrollments = this.enrollmentStore.loadEnrollments;
  private readonly certificateStore = inject(CertificatesStore);
  readonly loadCertificates = this.certificateStore.loadCertificates;
  readonly dashboardLoadState = signal<ResourceLoadState>({ ...IDLE_LOAD_STATE });
  readonly dashboardStats = computed(() => ({
    students: this.students().length,
    activeStudents: this.students().filter(({ active }) => active).length,
    courses: this.courses().length,
    enrolled: this.enrollments().filter(({ status }) => status === 'Approved').length,
    pending: this.enrollments().filter(({ status }) => status === 'Pending').length,
  }));

  constructor() {
    this.studentStore
      .observeChanges()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (event.deletedStudentId !== undefined) {
          this.enrollmentStore.removeForStudent(event.deletedStudentId);
          this.certificateStore.removeForStudent(event.deletedStudentId);
        }
        this.refreshDashboardSummary();
      });
    this.courseStore
      .observeChanges()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshDashboardSummary());
    this.enrollmentStore
      .observeChanges()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshDashboardSummary());
  }

  loadForRole(role: UserRole): void {
    this.loadDashboard();
    if (role === 'Administrator') this.loadCertificates();
  }

  loadDashboardView(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.startLoading(this.dashboardLoadState);
    this.studentStore.beginLoad();
    this.courseStore.beginLoad();
    this.enrollmentStore.beginLoad();
    this.dashboardApi
      .getData()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ students, courses, enrollments }) => {
          this.studentStore.hydrate(students);
          this.courseStore.hydrate(courses);
          this.enrollmentStore.hydrate(enrollments);
          this.liveSync.watchCourses(courses.map(({ code }) => code));
          this.finishLoading(this.dashboardLoadState);
        },
        error: (error: unknown) => {
          this.failLoading(this.dashboardLoadState, error);
          this.studentStore.failLoad(error);
          this.courseStore.failLoad(error);
          this.enrollmentStore.failLoad(error);
        },
      });
  }

  private startLoading(state: { set(value: ResourceLoadState): void }): void {
    state.set({ loading: true, loaded: false, error: null });
  }

  private finishLoading(state: { set(value: ResourceLoadState): void }): void {
    state.set({ loading: false, loaded: true, error: null });
  }

  private failLoading(state: { set(value: ResourceLoadState): void }, error: unknown): void {
    state.set({ loading: false, loaded: false, error: apiErrorMessage(error) });
  }

  private refreshDashboardSummary(): void {
    if (this.dashboardLoadState().loaded) this.loadDashboard();
  }
}
