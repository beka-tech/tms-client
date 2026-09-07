import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { patchState, signalStore, withState, withMethods } from '@ngrx/signals';
import { Observable, Subject, tap, throwError } from 'rxjs';
import { EnrollmentService } from './enrollment';

import { EnrollmentRecord, EnrollmentDraft, EnrollmentStatus } from '../enrollments.model';

import { apiErrorMessage } from '../../../core/notifications/global-message.service';
import { LiveSyncService } from '../../../core/realtime/live-sync';
import { IDLE_LOAD_STATE } from '../../../shared/data-access/resource-load-state';
import { CoursesStore } from '../../courses/data-access/courses.store';

export const EnrollmentsStore = signalStore(
  { providedIn: 'root' },
  withState({ enrollments: [] as EnrollmentRecord[], enrollmentLoadState: { ...IDLE_LOAD_STATE } }),
  withMethods((store) => {
    const api = inject(EnrollmentService);
    const destroyRef = inject(DestroyRef);
    const liveSync = inject(LiveSyncService);
    const courses = inject(CoursesStore);
    const changes = new Subject<void>();
    destroyRef.onDestroy(() => changes.complete());
    function setRows(rows: EnrollmentRecord[]): void {
      patchState(store, { enrollments: rows });
    }
    function updateRows(update: (rows: EnrollmentRecord[]) => EnrollmentRecord[]): void {
      setRows(update(store.enrollments()));
    }
    function beginLoad(): void {
      patchState(store, { enrollmentLoadState: { loading: true, loaded: false, error: null } });
    }
    function finishLoad(): void {
      patchState(store, { enrollmentLoadState: { loading: false, loaded: true, error: null } });
    }
    function failLoad(error: unknown): void {
      patchState(store, {
        enrollmentLoadState: { loading: false, loaded: false, error: apiErrorMessage(error) },
      });
    }
    function hydrate(rows: EnrollmentRecord[]): void {
      setRows(rows);
      finishLoad();
    }

    function loadEnrollments(): void {
      beginLoad();
      api
        .getAll()
        .pipe(takeUntilDestroyed(destroyRef))
        .subscribe({
          next: (enrollments) => {
            setRows(enrollments);
            finishLoad();
          },
          error: (error: unknown) => failLoad(error),
        });
    }

    function addEnrollment(draft: EnrollmentDraft): Observable<EnrollmentRecord> {
      const course = courses.courseById(draft.courseId);
      if (!course) return throwError(() => new Error('Choose an available course.'));
      return api.create({ studentId: draft.studentId, courseCode: course.code }).pipe(
        tap((created) => {
          upsertEnrollment(created, true);
          changes.next();
        }),
      );
    }

    function setEnrollmentStatus(id: string, status: EnrollmentStatus): Observable<void> {
      if (status === 'Pending') {
        return throwError(() => new Error('Pending is not a supported status transition.'));
      }
      const request = status === 'Approved' ? api.approve(id) : api.reject(id);
      return request.pipe(
        tap(() => {
          replaceEnrollment(id, (row) => ({ ...row, status }));
          changes.next();
        }),
      );
    }

    function setGrade(id: string, grade: number): Observable<void> {
      const normalizedGrade = Math.min(100, Math.max(0, grade));
      return api
        .saveGrade({ enrollmentId: id, score: normalizedGrade })
        .pipe(tap(() => replaceEnrollment(id, (row) => ({ ...row, grade: normalizedGrade }))));
    }

    function replaceEnrollment(
      id: string,
      update: (row: EnrollmentRecord) => EnrollmentRecord,
    ): void {
      updateRows((rows) => rows.map((row) => (row.id === id ? update(row) : row)));
    }

    function upsertEnrollment(enrollment: EnrollmentRecord, prepend = false): void {
      updateRows((rows) => {
        const remaining = rows.filter(({ id }) => id !== enrollment.id);
        return prepend ? [enrollment, ...remaining] : [...remaining, enrollment];
      });
    }
    function removeForStudent(studentId: number): void {
      updateRows((rows) => rows.filter((row) => row.studentId !== studentId));
    }
    liveSync.enrollmentStatusUpdated$
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(({ id, status }) => {
        replaceEnrollment(id, (row) => ({ ...row, status }));
        changes.next();
      });
    liveSync.gradePosted$
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(({ courseCode, studentId, grade }) => {
        const courseId = courses.courses().find((course) => course.code === courseCode)?.id;
        if (courseId === undefined) return;
        updateRows((rows) =>
          rows.map((row) =>
            row.studentId === studentId && row.courseId === courseId ? { ...row, grade } : row,
          ),
        );
      });

    function enrollmentCount(courseId: number): number {
      const loadedCount = store
        .enrollments()
        .filter((row) => row.courseId === courseId && row.status !== 'Rejected').length;
      return store.enrollmentLoadState().loaded
        ? loadedCount
        : (courses.courseById(courseId)?.enrollmentCount ?? loadedCount);
    }
    return {
      enrollmentCount,
      loadEnrollments,
      addEnrollment,
      setEnrollmentStatus,
      setGrade,
      hydrate,
      beginLoad,
      failLoad,
      observeChanges: () => changes.asObservable(),
      removeForStudent,
    };
  }),
);
