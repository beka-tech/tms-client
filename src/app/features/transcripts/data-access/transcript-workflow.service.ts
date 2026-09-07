import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, from, switchMap, takeWhile, timer } from 'rxjs';
import { TranscriptReport } from '../transcripts.model';
import { apiErrorMessage } from '../../../core/notifications/global-message.service';
import { LiveSyncService } from '../../../core/realtime/live-sync';
import { TranscriptService } from './transcript.service';

const REPORT_STORAGE_KEY = 'tms.transcript.latestReport';

@Injectable({ providedIn: 'root' })
export class TranscriptWorkflowService {
  private readonly api = inject(TranscriptService);
  private readonly realtime = inject(LiveSyncService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private pollSubscription: Subscription | null = null;

  private readonly reportState = signal<TranscriptReport | null>(this.restoreReport());
  readonly report = this.reportState.asReadonly();
  readonly isSubmitting = signal(false);
  readonly isPolling = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.realtime.transcriptReady$
      .pipe(takeUntilDestroyed())
      .subscribe(({ reportId, downloadUrl }) => {
        const current = this.reportState();
        if (!current || current.reportId !== reportId) return;
        this.setReport({ ...current, status: 'Completed', downloadUrl });
        this.stopPolling();
      });

    const restored = this.reportState();
    if (restored && restored.status !== 'Completed' && restored.status !== 'Failed') {
      this.startPolling(restored.reportId);
    }
  }

  request(studentId: number): void {
    if (this.isSubmitting()) return;
    this.error.set(null);
    this.isSubmitting.set(true);
    from(this.realtime.connectForStudent(studentId))
      .pipe(switchMap(() => this.api.request(studentId)))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (report) => {
          const normalized = { ...report, studentId, status: report.status ?? 'Queued' };
          this.setReport(normalized);
          this.isSubmitting.set(false);
          if (normalized.status !== 'Completed' && normalized.status !== 'Failed') {
            this.startPolling(normalized.reportId);
          }
        },
        error: (error: unknown) => {
          this.isSubmitting.set(false);
          this.error.set(apiErrorMessage(error));
        },
      });
  }

  retry(): void {
    const report = this.reportState();
    if (!report) return;
    this.error.set(null);
    this.startPolling(report.reportId);
  }

  clear(): void {
    this.stopPolling();
    this.reportState.set(null);
    this.error.set(null);
    if (isPlatformBrowser(this.platformId)) sessionStorage.removeItem(REPORT_STORAGE_KEY);
  }

  private startPolling(reportId: string): void {
    this.stopPolling();
    this.isPolling.set(true);
    this.pollSubscription = timer(0, 5000)
      .pipe(
        switchMap(() => this.api.getStatus(reportId)),
        takeWhile((report) => report.status === 'Queued' || report.status === 'Processing', true),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (report) => {
          const current = this.reportState();
          this.setReport({ ...report, studentId: report.studentId ?? current?.studentId ?? 0 });
          if (report.status === 'Completed' || report.status === 'Failed') {
            this.isPolling.set(false);
          }
        },
        error: (error: unknown) => {
          this.isPolling.set(false);
          this.error.set(apiErrorMessage(error));
        },
        complete: () => this.isPolling.set(false),
      });
  }

  private stopPolling(): void {
    this.pollSubscription?.unsubscribe();
    this.pollSubscription = null;
    this.isPolling.set(false);
  }

  private setReport(report: TranscriptReport): void {
    this.reportState.set(report);
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(report));
    }
  }

  private restoreReport(): TranscriptReport | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const rawReport = sessionStorage.getItem(REPORT_STORAGE_KEY);
      if (!rawReport) return null;
      const report = JSON.parse(rawReport) as Partial<TranscriptReport>;
      return typeof report.reportId === 'string' && typeof report.studentId === 'number'
        ? (report as TranscriptReport)
        : null;
    } catch {
      sessionStorage.removeItem(REPORT_STORAGE_KEY);
      return null;
    }
  }
}
