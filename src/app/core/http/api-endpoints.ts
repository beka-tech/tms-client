export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    refresh: '/auth/refresh',
  },
  students: '/v2/students',
  courseList: '/v1/courses',
  courses: '/v2/courses',
  enrollments: '/v2/enrollments',
  certificates: '/v1/certificates',
  transcripts: '/v2/transcripts',
} as const;

export const TMS_HUB_EVENTS = {
  transcriptReady: 'ReceiveTranscriptReady',
  courseUpdate: 'ReceiveCourseUpdate',
  gradePosted: 'ReceiveGradePosted',
  enrollmentStatusUpdated: 'ReceiveEnrollmentStatusUpdated',
} as const;

export function resourceUrl(base: string, id: string | number): string {
  return `${base}/${encodeURIComponent(String(id))}`;
}
