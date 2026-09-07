export interface PagedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  traceId?: string;
  errors?: Record<string, readonly string[]>;
}

export interface ApiMessageResponse {
  message: string;
}

export type ApiCollectionResponse<T> = T[] | PagedResponse<T> | { data: T[] | PagedResponse<T> };
