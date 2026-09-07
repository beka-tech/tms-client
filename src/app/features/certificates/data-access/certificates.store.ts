import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { patchState, signalStore, withState, withMethods } from '@ngrx/signals';
import { Observable, tap } from 'rxjs';
import { CertificateService } from './certificate.service';

import { CertificateRecord } from '../certificates.model';
import { apiErrorMessage } from '../../../core/notifications/global-message.service';
import { IDLE_LOAD_STATE } from '../../../shared/data-access/resource-load-state';

export const CertificatesStore = signalStore(
  { providedIn: 'root' },
  withState({
    certificates: [] as CertificateRecord[],
    certificateLoadState: { ...IDLE_LOAD_STATE },
  }),
  withMethods((store) => {
    const api = inject(CertificateService);
    const destroyRef = inject(DestroyRef);
    function setRows(rows: CertificateRecord[]): void {
      patchState(store, { certificates: rows });
    }
    function updateRows(update: (rows: CertificateRecord[]) => CertificateRecord[]): void {
      setRows(update(store.certificates()));
    }
    function beginLoad(): void {
      patchState(store, { certificateLoadState: { loading: true, loaded: false, error: null } });
    }
    function finishLoad(): void {
      patchState(store, { certificateLoadState: { loading: false, loaded: true, error: null } });
    }
    function failLoad(error: unknown): void {
      patchState(store, {
        certificateLoadState: { loading: false, loaded: false, error: apiErrorMessage(error) },
      });
    }
    function hydrate(rows: CertificateRecord[]): void {
      setRows(rows);
      finishLoad();
    }

    function loadCertificates(): void {
      beginLoad();
      api
        .getAll()
        .pipe(takeUntilDestroyed(destroyRef))
        .subscribe({
          next: (certificates) => {
            setRows(certificates);
            finishLoad();
          },
          error: (error: unknown) => failLoad(error),
        });
    }

    function issueCertificate(enrollmentId: string): Observable<CertificateRecord> {
      return api.issue({ enrollmentId }).pipe(
        tap((issued) => {
          updateRows((rows) => [issued, ...rows.filter(({ id }) => id !== issued.id)]);
        }),
      );
    }
    function removeForStudent(studentId: number): void {
      updateRows((rows) => rows.filter((row) => row.studentId !== studentId));
    }

    return {
      loadCertificates,
      issueCertificate,
      hydrate,
      beginLoad,
      failLoad,
      removeForStudent,
    };
  }),
);
