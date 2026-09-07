import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS, resourceUrl } from '../../../core/http/api-endpoints';
import { CertificateDraft, CertificateRecord } from '../certificates.model';
import { ApiClientService, ApiQuery } from '../../../core/http/api-client.service';

@Injectable({ providedIn: 'root' })
export class CertificateService {
  private readonly api = inject(ApiClientService);

  getAll(query: ApiQuery = {}): Observable<CertificateRecord[]> {
    return this.api.getCollection<CertificateRecord>(API_ENDPOINTS.certificates, { params: query });
  }

  getById(id: number): Observable<CertificateRecord> {
    return this.api.get<CertificateRecord>(resourceUrl(API_ENDPOINTS.certificates, id));
  }

  issue(request: CertificateDraft): Observable<CertificateRecord> {
    return this.api.post<CertificateRecord, CertificateDraft>(API_ENDPOINTS.certificates, request);
  }
}
