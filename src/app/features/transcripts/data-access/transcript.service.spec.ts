import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranscriptService } from './transcript.service';

describe('TranscriptService', () => {
  let service: TranscriptService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TranscriptService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('submits an idempotent v2 transcript request and normalizes its state', () => {
    let status = '';
    service.request(17).subscribe((report) => (status = report.status));

    const request = http.expectOne('/api/v2/transcripts');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ studentId: 17 });
    expect(request.request.headers.get('Idempotency-Key')).toContain('transcript-17-');
    request.flush({
      reportId: 'report-17',
      studentId: 17,
      state: 'Queued',
      requestedAt: '2026-09-04T12:00:00Z',
    });

    expect(status).toBe('Queued');
  });

  it('uses the status route and maps Ready to Completed', () => {
    let status = '';
    service.getStatus('report-17').subscribe((report) => (status = report.status));

    const request = http.expectOne('/api/v2/transcripts/report-17/status');
    expect(request.request.method).toBe('GET');
    request.flush({
      reportId: 'report-17',
      studentId: 17,
      state: 'Ready',
      requestedAt: '2026-09-04T12:00:00Z',
      completedAt: '2026-09-04T12:01:00Z',
      downloadUrl: '/reports/report-17',
    });

    expect(status).toBe('Completed');
  });
});
