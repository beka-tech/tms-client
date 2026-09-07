export interface CertificateRecord {
  id: number;
  serial: string;
  studentId: number;
  courseId: number;
  issuedAt: string;
}

export interface CertificateDraft {
  enrollmentId: string;
}
