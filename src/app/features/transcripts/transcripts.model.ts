export type TranscriptStatus = 'Queued' | 'Processing' | 'Completed' | 'Failed';

export interface TranscriptRequest {
  studentId: number;
}

export interface TranscriptReport {
  reportId: string;
  studentId: number;
  status: TranscriptStatus;
  requestedAt?: string;
  completedAt?: string | null;
  downloadUrl?: string | null;
  errorMessage?: string | null;
}
