import { EnrollmentStatus } from '../../core/realtime/realtime.model';
export type { EnrollmentStatus } from '../../core/realtime/realtime.model';

export interface EnrollmentRecord {
  id: string;
  studentId: number;
  courseId: number;
  status: EnrollmentStatus;
  grade: number | null;
  enrolledAt: string;
}

export interface EnrollmentDraft {
  studentId: number;
  courseId: number;
}

export interface GradeDraft {
  enrollmentId: string;
  score: number;
}
