import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TMS_HUB_EVENTS } from '../http/api-endpoints';
import {
  CourseUpdateEvent,
  EnrollmentStatusEvent,
  GradePostedEvent,
  TranscriptReadyEvent,
} from './realtime.model';
import { EnrollmentStatus } from './realtime.model';
import { AuthStateService } from '../auth/auth-state.service';

export type RealtimeConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

@Injectable({ providedIn: 'root' })
export class LiveSyncService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthStateService);
  private connection: HubConnection | null = null;
  private startPromise: Promise<void> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryAttempt = 0;
  private shouldReconnect = false;
  private transcriptStudentId: number | null = null;
  private readonly watchedCourseCodes = new Set<string>();

  private readonly transcriptReadySubject = new Subject<TranscriptReadyEvent>();
  private readonly courseUpdateSubject = new Subject<CourseUpdateEvent>();
  private readonly gradePostedSubject = new Subject<GradePostedEvent>();
  private readonly enrollmentStatusSubject = new Subject<EnrollmentStatusEvent>();

  readonly transcriptReady$ = this.transcriptReadySubject.asObservable();
  readonly courseUpdate$ = this.courseUpdateSubject.asObservable();
  readonly gradePosted$ = this.gradePostedSubject.asObservable();
  readonly enrollmentStatusUpdated$ = this.enrollmentStatusSubject.asObservable();
  readonly events$ = this.enrollmentStatusUpdated$;

  readonly connectionState = signal<RealtimeConnectionState>('disconnected');
  readonly lastError = signal<string | null>(null);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;

    const browserWindow = this.document.defaultView;
    browserWindow?.addEventListener('online', this.handleBrowserWake);
    browserWindow?.addEventListener('pageshow', this.handleBrowserWake);
    browserWindow?.addEventListener('offline', this.handleOffline);
    this.document.addEventListener('visibilitychange', this.handleVisibilityChange);

    this.destroyRef.onDestroy(() => {
      browserWindow?.removeEventListener('online', this.handleBrowserWake);
      browserWindow?.removeEventListener('pageshow', this.handleBrowserWake);
      browserWindow?.removeEventListener('offline', this.handleOffline);
      this.document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      void this.stop();
    });
  }

  connect(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || !this.auth.accessToken()) return Promise.resolve();
    this.shouldReconnect = true;
    this.connection ??= this.createConnection();
    return this.ensureConnected();
  }

  async connectForStudent(studentId: number): Promise<void> {
    if (this.transcriptStudentId !== studentId) {
      await this.stop();
      this.transcriptStudentId = studentId;
    }
    return this.connect();
  }

  watchCourses(courseCodes: readonly string[]): void {
    for (const code of courseCodes) this.watchedCourseCodes.add(code);
    if (this.connection?.state === HubConnectionState.Connected) {
      void this.joinCourseGroups();
    }
  }

  async stop(): Promise<void> {
    this.shouldReconnect = false;
    this.clearRetryTimer();
    const connection = this.connection;
    this.connection = null;
    this.startPromise = null;
    this.retryAttempt = 0;
    this.transcriptStudentId = null;
    if (connection && connection.state !== HubConnectionState.Disconnected) {
      await connection.stop();
    }
    this.connectionState.set('disconnected');
  }

  private createConnection(): HubConnection {
    const connection = new HubConnectionBuilder()
      .withUrl(this.hubUrl(), { accessTokenFactory: () => this.auth.accessToken() ?? '' })
      .withAutomaticReconnect([0, 2000, 5000, 10_000, 30_000])
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on(TMS_HUB_EVENTS.transcriptReady, (reportId: string, downloadUrl: string) => {
      this.transcriptReadySubject.next({ reportId, downloadUrl });
    });
    connection.on(TMS_HUB_EVENTS.courseUpdate, (courseCode: string, message: string) => {
      this.courseUpdateSubject.next({ courseCode, message });
    });
    connection.on(
      TMS_HUB_EVENTS.gradePosted,
      (courseCode: string, studentId: number, grade: number) => {
        this.gradePostedSubject.next({ courseCode, studentId, grade });
      },
    );
    connection.on(
      TMS_HUB_EVENTS.enrollmentStatusUpdated,
      (id: string, status: EnrollmentStatus) => {
        this.enrollmentStatusSubject.next({ id, status });
      },
    );

    connection.onreconnecting((error) => {
      this.connectionState.set('reconnecting');
      this.lastError.set(error?.message ?? 'Realtime connection interrupted.');
    });
    connection.onreconnected(() => {
      this.retryAttempt = 0;
      this.connectionState.set('connected');
      this.lastError.set(null);
      void this.joinCourseGroups();
    });
    connection.onclose((error) => {
      this.connectionState.set('disconnected');
      if (error) this.lastError.set(error.message);
      this.scheduleReconnect();
    });
    return connection;
  }

  private ensureConnected(): Promise<void> {
    if (!this.shouldReconnect || !this.connection) return Promise.resolve();
    if (!this.isOnline()) {
      this.connectionState.set('disconnected');
      this.lastError.set('Network connection is unavailable.');
      return Promise.resolve();
    }
    if (
      this.connection.state === HubConnectionState.Connected ||
      this.connection.state === HubConnectionState.Connecting ||
      this.connection.state === HubConnectionState.Reconnecting
    ) {
      return this.startPromise ?? Promise.resolve();
    }
    if (this.startPromise) return this.startPromise;

    this.connectionState.set('connecting');
    this.startPromise = this.connection
      .start()
      .then(() => {
        this.retryAttempt = 0;
        this.connectionState.set('connected');
        this.lastError.set(null);
        void this.joinCourseGroups();
      })
      .catch((error: unknown) => {
        this.connectionState.set('disconnected');
        this.lastError.set(error instanceof Error ? error.message : 'Realtime connection failed.');
        this.scheduleReconnect();
      })
      .finally(() => (this.startPromise = null));
    return this.startPromise;
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect || this.retryTimer || !this.isOnline()) return;
    const delay = Math.min(30_000, 1000 * 2 ** Math.min(this.retryAttempt++, 5));
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.ensureConnected();
    }, delay);
  }

  private clearRetryTimer(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  private readonly handleBrowserWake = (): void => {
    this.clearRetryTimer();
    void this.ensureConnected();
  };

  private readonly handleOffline = (): void => {
    this.connectionState.set('disconnected');
    this.lastError.set('Network connection is unavailable.');
  };

  private readonly handleVisibilityChange = (): void => {
    if (this.document.visibilityState === 'visible') this.handleBrowserWake();
  };

  private isOnline(): boolean {
    return this.document.defaultView?.navigator.onLine !== false;
  }

  private hubUrl(): string {
    const url = /^https?:\/\//i.test(environment.hubUrl)
      ? new URL(environment.hubUrl)
      : new URL(environment.hubUrl, this.document.location?.origin ?? 'http://localhost');
    if (this.transcriptStudentId !== null) {
      url.searchParams.set('studentId', String(this.transcriptStudentId));
    }
    return url.href;
  }

  private async joinCourseGroups(): Promise<void> {
    if (this.connection?.state !== HubConnectionState.Connected) return;
    for (const courseCode of this.watchedCourseCodes) {
      try {
        await this.connection.invoke('JoinCourseGroup', courseCode);
      } catch (error: unknown) {
        this.lastError.set(
          error instanceof Error ? error.message : `Could not watch course ${courseCode}.`,
        );
      }
    }
  }
}

export type { EnrollmentStatusEvent } from './realtime.model';
