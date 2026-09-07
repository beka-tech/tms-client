export type EnrollmentStatus = 'Pending' | 'Approved' | 'Rejected' | 'Completed';

export interface TranscriptReadyEvent {
  reportId: string;
  downloadUrl: string;
}

export interface CourseUpdateEvent {
  courseCode: string;
  message: string;
}

export interface EnrollmentStatusEvent {
  id: string;
  status: EnrollmentStatus;
}

export interface GradePostedEvent {
  courseCode: string;
  studentId: number;
  grade: number;
}
