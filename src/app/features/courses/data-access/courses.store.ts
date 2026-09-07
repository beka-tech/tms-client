import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { patchState, signalStore, withState, withMethods } from '@ngrx/signals';
import { Observable, Subject, tap } from 'rxjs';
import { CourseService } from './course.service';

import { TrainingCourse, CourseDraft } from '../courses.model';

import { apiErrorMessage } from '../../../core/notifications/global-message.service';
import { LiveSyncService } from '../../../core/realtime/live-sync';
import { IDLE_LOAD_STATE } from '../../../shared/data-access/resource-load-state';

export const CoursesStore = signalStore(
  { providedIn: 'root' },
  withState({ courses: [] as TrainingCourse[], courseLoadState: { ...IDLE_LOAD_STATE } }),
  withMethods((store) => {
    const api = inject(CourseService);
    const destroyRef = inject(DestroyRef);
    const liveSync = inject(LiveSyncService);
    const changes = new Subject<void>();
    destroyRef.onDestroy(() => changes.complete());
    function setRows(rows: TrainingCourse[]): void {
      patchState(store, { courses: rows });
    }
    function updateRows(update: (rows: TrainingCourse[]) => TrainingCourse[]): void {
      setRows(update(store.courses()));
    }
    function beginLoad(): void {
      patchState(store, { courseLoadState: { loading: true, loaded: false, error: null } });
    }
    function finishLoad(): void {
      patchState(store, { courseLoadState: { loading: false, loaded: true, error: null } });
    }
    function failLoad(error: unknown): void {
      patchState(store, {
        courseLoadState: { loading: false, loaded: false, error: apiErrorMessage(error) },
      });
    }
    function hydrate(rows: TrainingCourse[]): void {
      setRows(rows);
      finishLoad();
    }

    function loadCourses(): void {
      beginLoad();
      api
        .getAll()
        .pipe(takeUntilDestroyed(destroyRef))
        .subscribe({
          next: (courses) => {
            setRows(courses);
            liveSync.watchCourses(courses.map(({ code }) => code));
            finishLoad();
          },
          error: (error: unknown) => failLoad(error),
        });
    }

    function courseById(id: number): TrainingCourse | undefined {
      return store.courses().find((course) => course.id === id);
    }

    function addCourse(draft: CourseDraft): Observable<TrainingCourse> {
      return api.create(draft).pipe(
        tap((created) => {
          updateRows((courses) => [...courses, created]);
          changes.next();
        }),
      );
    }
    liveSync.courseUpdate$.pipe(takeUntilDestroyed(destroyRef)).subscribe(() => {
      if (store.courseLoadState().loaded) loadCourses();
    });

    return {
      loadCourses,
      courseById,
      addCourse,
      hydrate,
      beginLoad,
      failLoad,
      observeChanges: () => changes.asObservable(),
    };
  }),
);
