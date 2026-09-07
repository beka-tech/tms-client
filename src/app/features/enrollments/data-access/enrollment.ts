import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS, resourceUrl } from '../../../core/http/api-endpoints';
import { EnrollmentRecord, EnrollmentStatus, GradeDraft } from '../enrollments.model';
import { ApiClientService, ApiQuery } from '../../../core/http/api-client.service';

@Injectable({ providedIn: 'root' })
export class EnrollmentService {
  private readonly api = inject(ApiClientService);

  getAll(query: ApiQuery = {}): Observable<EnrollmentRecord[]> {
    return this.api
      .getCollection<EnrollmentApiModel>(API_ENDPOINTS.enrollments, { params: query })
      .pipe(map((enrollments) => enrollments.map((enrollment) => this.normalize(enrollment))));
  }

  create(enrollment: EnrollmentCreateRequest): Observable<EnrollmentRecord> {
    return this.api
      .post<EnrollmentApiModel, EnrollmentCreateRequest>(API_ENDPOINTS.enrollments, enrollment)
      .pipe(map((created) => this.normalize(created)));
  }

  approve(id: string): Observable<void> {
    return this.api.post<void, Record<string, never>>(
      `${resourceUrl(API_ENDPOINTS.enrollments, id)}/approve`,
      {},
    );
  }

  reject(id: string): Observable<void> {
    return this.api.post<void, Record<string, never>>(
      `${resourceUrl(API_ENDPOINTS.enrollments, id)}/reject`,
      {},
    );
  }

  saveGrade(grade: GradeDraft): Observable<void> {
    return this.api.patch<void, { grade: number }>(
      `${resourceUrl(API_ENDPOINTS.enrollments, grade.enrollmentId)}/grade`,
      { grade: grade.score },
    );
  }

  private normalize(enrollment: EnrollmentApiModel): EnrollmentRecord {
    return {
      id: String(enrollment.id),
      studentId: enrollment.studentId,
      courseId: enrollment.courseId,
      status: enrollment.status as EnrollmentStatus,
      grade: enrollment.grade ?? null,
      enrolledAt: enrollment.enrolledAt,
    };
  }
}

export interface EnrollmentCreateRequest {
  studentId: number;
  courseCode: string;
}

interface EnrollmentApiModel {
  id: string | number;
  studentId: number;
  courseId: number;
  status: string;
  grade?: number | null;
  enrolledAt: string;
}
