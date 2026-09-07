import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiCollectionResponse, PagedResponse } from './api.model';

type QueryValue = string | number | boolean | readonly (string | number | boolean)[];
export type ApiQuery = Record<string, QueryValue | null | undefined>;

export interface RequestOptions {
  params?: ApiQuery;
  context?: HttpContext;
  headers?: Record<string, string>;
}

@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl.replace(/\/$/, '');

  get<T>(path: string, options: RequestOptions = {}): Observable<T> {
    return this.http.get<T>(this.url(path), this.options(options));
  }

  getCollection<T>(path: string, options: RequestOptions = {}): Observable<T[]> {
    return this.get<ApiCollectionResponse<T>>(path, options).pipe(
      map((response) => this.collectionItems(response)),
    );
  }

  getPaged<T>(path: string, options: RequestOptions = {}): Observable<PagedResponse<T>> {
    return this.get<PagedResponse<T>>(path, options);
  }

  post<TResponse, TBody = unknown>(
    path: string,
    body: TBody,
    options: RequestOptions = {},
  ): Observable<TResponse> {
    return this.http.post<TResponse>(this.url(path), body, this.options(options));
  }

  put<TResponse, TBody = unknown>(
    path: string,
    body: TBody,
    options: RequestOptions = {},
  ): Observable<TResponse> {
    return this.http.put<TResponse>(this.url(path), body, this.options(options));
  }

  patch<TResponse, TBody = unknown>(
    path: string,
    body: TBody,
    options: RequestOptions = {},
  ): Observable<TResponse> {
    return this.http.patch<TResponse>(this.url(path), body, this.options(options));
  }

  delete<TResponse>(path: string, options: RequestOptions = {}): Observable<TResponse> {
    return this.http.delete<TResponse>(this.url(path), this.options(options));
  }

  private url(path: string): string {
    if (/^https?:\/\//i.test(path)) return path;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${normalizedPath}`;
  }

  private options(options: RequestOptions): {
    params?: HttpParams;
    context?: HttpContext;
    headers?: Record<string, string>;
  } {
    const params = options.params ? this.httpParams(options.params) : undefined;
    return {
      ...(params ? { params } : {}),
      ...(options.context ? { context: options.context } : {}),
      ...(options.headers ? { headers: options.headers } : {}),
    };
  }

  private httpParams(query: ApiQuery): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined) continue;
      if (Array.isArray(value)) {
        for (const item of value) params = params.append(key, String(item));
      } else {
        params = params.set(key, String(value));
      }
    }
    return params;
  }

  private collectionItems<T>(response: ApiCollectionResponse<T>): T[] {
    if (Array.isArray(response)) return response;
    if ('items' in response) return response.items;
    if (Array.isArray(response.data)) return response.data;
    return response.data.items;
  }
}
