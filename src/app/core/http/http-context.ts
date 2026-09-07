import { HttpContext, HttpContextToken } from '@angular/common/http';

export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);
export const SILENT_API_ERRORS = new HttpContextToken<boolean>(() => false);

export function authRequestContext(silentErrors = false): HttpContext {
  return new HttpContext().set(SKIP_AUTH, true).set(SILENT_API_ERRORS, silentErrors);
}
