import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS, resourceUrl } from '../../../core/http/api-endpoints';
import { TranscriptReport, TranscriptRequest } from '../transcripts.model';
import { ApiClientService } from '../../../core/http/api-client.service';

@Injectable({ providedIn: 'root' })
export class TranscriptService {
  private readonly api = inject(ApiClientService);

  request(studentId: number): Observable<TranscriptReport> {
    return this.api
      .post<TranscriptApiStatus, TranscriptRequest>(
        API_ENDPOINTS.transcripts,
        { studentId },
        { headers: { 'Idempotency-Key': this.idempotencyKey(studentId) } },
      )
      .pipe(map((report) => this.normalize(report)));
  }

  getStatus(reportId: string): Observable<TranscriptReport> {
    return this.api
      .get<TranscriptApiStatus>(`${resourceUrl(API_ENDPOINTS.transcripts, reportId)}/status`)
      .pipe(map((report) => this.normalize(report)));
  }

  private normalize(report: TranscriptApiStatus): TranscriptReport {
    return {
      reportId: report.reportId,
      studentId: report.studentId,
      status: report.state === 'Ready' ? 'Completed' : report.state,
      requestedAt: report.requestedAt,
      completedAt: report.completedAt,
      downloadUrl: report.downloadUrl,
      errorMessage: report.errorMessage,
    };
  }

  private idempotencyKey(studentId: number): string {
    const randomId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    return `transcript-${studentId}-${randomId}`;
  }
}

interface TranscriptApiStatus {
  reportId: string;
  studentId: number;
  state: 'Queued' | 'Processing' | 'Ready' | 'Failed';
  requestedAt?: string;
  completedAt?: string | null;
  downloadUrl?: string | null;
  errorMessage?: string | null;
}
