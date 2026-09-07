import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS, resourceUrl } from '../../../core/http/api-endpoints';
import { Student, StudentDraft } from '../students.model';
import { ApiClientService, ApiQuery } from '../../../core/http/api-client.service';

@Injectable({ providedIn: 'root' })
export class StudentService {
  private readonly api = inject(ApiClientService);

  getAll(query: ApiQuery = { page: 1, pageSize: 50 }): Observable<Student[]> {
    return this.api
      .getCollection<StudentApiModel>(API_ENDPOINTS.students, { params: query })
      .pipe(map((students) => students.map((student) => this.normalize(student))));
  }

  getById(id: number): Observable<Student> {
    return this.api
      .get<StudentApiModel>(resourceUrl(API_ENDPOINTS.students, id))
      .pipe(map((student) => this.normalize(student)));
  }

  create(student: StudentDraft): Observable<Student> {
    return this.api
      .post<StudentApiModel, StudentWriteModel>(API_ENDPOINTS.students, this.toRequest(student))
      .pipe(map((created) => this.normalize(created)));
  }

  update(id: number, student: StudentDraft): Observable<Student> {
    return this.api
      .put<StudentApiModel, StudentWriteModel>(
        resourceUrl(API_ENDPOINTS.students, id),
        this.toRequest(student),
      )
      .pipe(map((updated) => this.normalize(updated)));
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(resourceUrl(API_ENDPOINTS.students, id));
  }

  private toRequest(student: StudentDraft): StudentWriteModel {
    return {
      registrationNumber: student.registrationNumber,
      name: student.name,
      gpa: student.gpa,
      isActive: student.active,
    };
  }

  private normalize(student: StudentApiModel): Student {
    return {
      id: student.id,
      registrationNumber: student.registrationNumber,
      name: student.name,
      gpa: student.gpa,
      active: student.isActive,
    };
  }
}

interface StudentApiModel {
  id: number;
  registrationNumber: string;
  name: string;
  gpa: number;
  isActive: boolean;
}

type StudentWriteModel = Omit<StudentApiModel, 'id'>;
