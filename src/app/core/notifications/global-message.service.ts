import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { ProblemDetails } from '../http/api.model';

export type GlobalMessageKind = 'error' | 'warning' | 'success' | 'info';

export interface GlobalMessage {
  id: number;
  kind: GlobalMessageKind;
  text: string;
}

@Injectable({ providedIn: 'root' })
export class GlobalMessageService {
  private nextId = 1;
  private readonly messageState = signal<GlobalMessage[]>([]);

  readonly messages = this.messageState.asReadonly();

  show(kind: GlobalMessageKind, text: string, timeoutMs = 6500): number {
    const id = this.nextId++;
    this.messageState.update((messages) => [...messages.slice(-2), { id, kind, text }]);
    if (timeoutMs > 0) setTimeout(() => this.dismiss(id), timeoutMs);
    return id;
  }

  error(text: string): number {
    return this.show('error', text, 9000);
  }

  success(text: string): number {
    return this.show('success', text);
  }

  warning(text: string): number {
    return this.show('warning', text, 8000);
  }

  dismiss(id: number): void {
    this.messageState.update((messages) => messages.filter((message) => message.id !== id));
  }
}

export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'Something went wrong. Please try again.';

  const problem = error.error as ProblemDetails | string | null;
  if (typeof problem === 'string' && problem.trim()) return problem;
  if (problem && typeof problem === 'object') {
    if (problem.detail?.trim()) return problem.detail;
    if (problem.title?.trim()) return problem.title;
    const validationMessage = Object.values(problem.errors ?? {}).flat()[0];
    if (validationMessage) return validationMessage;
  }

  switch (error.status) {
    case 0:
      return 'The API is unreachable. Check your connection and try again.';
    case 400:
      return 'The request could not be completed. Check the entered information.';
    case 401:
      return 'Your session has expired. Sign in again to continue.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested record could not be found.';
    case 409:
      return 'This change conflicts with an existing record.';
    case 422:
      return 'Some information is invalid. Review the form and try again.';
    case 429:
      return 'Too many requests were sent. Wait a moment and try again.';
    default:
      return error.status >= 500
        ? 'The server is having trouble. Please retry in a moment.'
        : 'The request failed. Please try again.';
  }
}
