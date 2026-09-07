import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { patchState, signalStore, withState, withMethods } from '@ngrx/signals';
import { Observable, Subject, tap } from 'rxjs';
import { StudentService } from './student.service';
import { Student, StudentDraft } from '../students.model';

import { apiErrorMessage } from '../../../core/notifications/global-message.service';
import { IDLE_LOAD_STATE } from '../../../shared/data-access/resource-load-state';

export const StudentsStore = signalStore(
  { providedIn: 'root' },
  withState({ students: [] as Student[], studentLoadState: { ...IDLE_LOAD_STATE } }),
  withMethods((store) => {
    const api = inject(StudentService);
    const destroyRef = inject(DestroyRef);
    const changes = new Subject<{ deletedStudentId?: number }>();
    destroyRef.onDestroy(() => changes.complete());
    function setRows(rows: Student[]): void {
      patchState(store, { students: rows });
    }
    function updateRows(update: (rows: Student[]) => Student[]): void {
      setRows(update(store.students()));
    }
    function beginLoad(): void {
      patchState(store, { studentLoadState: { loading: true, loaded: false, error: null } });
    }
    function finishLoad(): void {
      patchState(store, { studentLoadState: { loading: false, loaded: true, error: null } });
    }
    function failLoad(error: unknown): void {
      patchState(store, {
        studentLoadState: { loading: false, loaded: false, error: apiErrorMessage(error) },
      });
    }
    function hydrate(rows: Student[]): void {
      setRows(rows);
      finishLoad();
    }

    function loadStudents(): void {
      beginLoad();
      api
        .getAll()
        .pipe(takeUntilDestroyed(destroyRef))
        .subscribe({
          next: (students) => {
            setRows(students);
            finishLoad();
          },
          error: (error: unknown) => failLoad(error),
        });
    }

    function studentById(id: number): Student | undefined {
      return store.students().find((student) => student.id === id);
    }

    function addStudent(draft: StudentDraft): Observable<Student> {
      return api.create(draft).pipe(
        tap((created) => {
          updateRows((students) => [...students, created]);
          changes.next({});
        }),
      );
    }

    function updateStudent(id: number, draft: StudentDraft): Observable<Student> {
      return api.update(id, draft).pipe(
        tap((updated) => {
          updateRows((students) =>
            students.map((student) => (student.id === id ? updated : student)),
          );
        }),
      );
    }

    function deleteStudent(id: number): Observable<void> {
      return api.delete(id).pipe(
        tap(() => {
          updateRows((students) => students.filter((student) => student.id !== id));
          changes.next({ deletedStudentId: id });
        }),
      );
    }

    return {
      loadStudents,
      studentById,
      addStudent,
      updateStudent,
      deleteStudent,
      hydrate,
      beginLoad,
      failLoad,
      observeChanges: () => changes.asObservable(),
    };
  }),
);
