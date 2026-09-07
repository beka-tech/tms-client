import { Injectable, computed, inject } from '@angular/core';
import { CertificatesStore } from './certificates.store';
import { EnrollmentsStore } from '../../enrollments/data-access/enrollments.store';
import { CoursesStore } from '../../courses/data-access/courses.store';
import { StudentsStore } from '../../students/data-access/students.store';

@Injectable({ providedIn: 'root' })
export class CertificatesFacade {
  private readonly certificatesStore = inject(CertificatesStore);
  readonly certificates = this.certificatesStore.certificates;
  readonly certificateLoadState = this.certificatesStore.certificateLoadState;
  readonly loadCertificates = this.certificatesStore.loadCertificates;
  readonly issueCertificate = this.certificatesStore.issueCertificate;
  private readonly enrollmentsStore = inject(EnrollmentsStore);
  readonly enrollments = this.enrollmentsStore.enrollments;
  private readonly coursesStore = inject(CoursesStore);
  readonly courseById = this.coursesStore.courseById;
  private readonly studentsStore = inject(StudentsStore);
  readonly studentById = this.studentsStore.studentById;

  readonly certificateRows = computed(() =>
    [...this.certificates()]
      .sort((left, right) => right.issuedAt.localeCompare(left.issuedAt))
      .map((certificate) => ({
        certificate,
        studentName: this.studentById(certificate.studentId)?.name ?? 'Unknown student',
        courseTitle: this.courseById(certificate.courseId)?.title ?? 'Unknown course',
      })),
  );

  // This projection helps the UI; the API remains authoritative for eligibility.
  readonly eligibleEnrollments = computed(() => {
    const issuedPairs = new Set(
      this.certificates().map(({ studentId, courseId }) => `${studentId}:${courseId}`),
    );
    return this.enrollments()
      .filter(
        (row) =>
          (row.status === 'Approved' || row.status === 'Completed') &&
          row.grade !== null &&
          row.grade >= 50 &&
          !issuedPairs.has(`${row.studentId}:${row.courseId}`),
      )
      .map((row) => ({
        id: row.id,
        studentName: this.studentById(row.studentId)?.name ?? 'Unknown student',
        courseTitle: this.courseById(row.courseId)?.title ?? 'Unknown course',
        grade: row.grade ?? 0,
      }));
  });
}
