import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS, resourceUrl } from '../../../core/http/api-endpoints';
import { CourseDraft, TrainingCourse } from '../courses.model';
import { ApiClientService, ApiQuery } from '../../../core/http/api-client.service';

interface CourseApiModel extends Partial<TrainingCourse> {
  id: number;
  code: string;
  title: string;
  maxCapacity?: number;
  enrollmentCount?: number;
}

interface CourseWriteModel {
  code: string;
  title: string;
  maxCapacity: number;
}

@Injectable({ providedIn: 'root' })
export class CourseService {
  private readonly api = inject(ApiClientService);

  getAll(page = 1, pageSize = 50): Observable<TrainingCourse[]> {
    const query: ApiQuery = { page, pageSize };
    return this.api
      .getCollection<CourseApiModel>(API_ENDPOINTS.courseList, { params: query })
      .pipe(map((courses) => courses.map((course) => this.normalize(course))));
  }

  getById(id: string | number): Observable<TrainingCourse> {
    return this.api
      .get<CourseApiModel>(resourceUrl(API_ENDPOINTS.courses, id))
      .pipe(map((course) => this.normalize(course)));
  }

  create(course: CourseDraft): Observable<TrainingCourse> {
    return this.api
      .post<CourseApiModel, CourseWriteModel>(API_ENDPOINTS.courses, {
        code: course.code,
        title: course.title,
        maxCapacity: course.capacity,
      })
      .pipe(map((created) => this.normalize(created)));
  }

  update(id: number, title: string): Observable<void> {
    return this.api.put<void, { title: string }>(resourceUrl(API_ENDPOINTS.courses, id), { title });
  }

  private normalize(course: CourseApiModel): TrainingCourse {
    return {
      id: course.id,
      code: course.code,
      title: course.title,
      capacity: course.capacity ?? course.maxCapacity ?? 0,
      enrollmentCount: course.enrollmentCount ?? 0,
      assessments: course.assessments ?? [],
    };
  }
}
