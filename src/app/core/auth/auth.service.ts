import { Injectable, inject } from '@angular/core';
import { Observable, finalize, firstValueFrom, map, shareReplay, throwError } from 'rxjs';
import { API_ENDPOINTS } from '../http/api-endpoints';
import { authRequestContext } from '../http/http-context';
import { AuthResponse, AuthTokens, AuthUser, LoginRequest, normalizeUserRole } from './auth.model';
import { ApiClientService } from '../http/api-client.service';
import { AuthStateService } from './auth-state.service';

interface JwtClaims {
  sub?: string;
  email?: string;
  name?: string;
  role?: string;
  [claim: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClientService);
  private readonly state = inject(AuthStateService);
  private refreshRequest$: Observable<string> | null = null;

  readonly accessToken = this.state.accessToken;
  readonly refreshToken = this.state.refreshToken;
  readonly currentUser = this.state.currentUser;
  readonly role = this.state.role;
  readonly isAuthenticated = this.state.isAuthenticated;

  getAccessToken(): string | null {
    return this.state.accessToken();
  }

  getRefreshToken(): string | null {
    return this.state.refreshToken();
  }

  hasRole(role: string): boolean {
    return this.state.role() === normalizeUserRole(role);
  }

  async login(credentials: LoginRequest): Promise<void> {
    const response = await firstValueFrom(
      this.api.post<AuthResponse, LoginRequest>(API_ENDPOINTS.auth.login, credentials, {
        context: authRequestContext(true),
      }),
    );
    const user = response.user
      ? this.normalizeUser(response.user)
      : this.userFromToken(response.accessToken, credentials.email);
    this.state.setSession(this.tokensFromResponse(response), user);
  }

  refreshSession(): Observable<string> {
    if (this.refreshRequest$) return this.refreshRequest$;

    const refreshToken = this.state.refreshToken();
    if (!refreshToken) return throwError(() => new Error('No refresh token is available.'));

    this.refreshRequest$ = this.api
      .post<AuthResponse, { refreshToken: string }>(
        API_ENDPOINTS.auth.refresh,
        { refreshToken },
        { context: authRequestContext(true) },
      )
      .pipe(
        map((response) => {
          const user = response.user
            ? this.normalizeUser(response.user)
            : (this.state.currentUser() ??
              this.userFromToken(response.accessToken, 'user@tms.local'));
          this.state.setSession(this.tokensFromResponse(response), user);
          return response.accessToken;
        }),
        finalize(() => (this.refreshRequest$ = null)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    return this.refreshRequest$;
  }

  logout(): void {
    this.state.clear();
  }

  expireSession(): void {
    this.state.clear();
  }

  private tokensFromResponse(response: AuthResponse): AuthTokens {
    return { accessToken: response.accessToken, refreshToken: response.refreshToken };
  }

  private userFromToken(accessToken: string, fallbackEmail: string): AuthUser {
    const claims = this.decodeJwt(accessToken);
    const roleClaim =
      claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ?? claims.role;
    const email = String(claims.email ?? claims.sub ?? fallbackEmail);
    return {
      id: claims.sub,
      email,
      displayName: String(claims.name ?? claims.email ?? email),
      role: normalizeUserRole(Array.isArray(roleClaim) ? roleClaim[0] : roleClaim),
    };
  }

  private normalizeUser(user: AuthUser): AuthUser {
    return { ...user, role: normalizeUserRole(user.role) };
  }

  private decodeJwt(token: string): JwtClaims {
    try {
      const segment = token.split('.')[1];
      if (!segment) return {};
      const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
      return JSON.parse(atob(padded)) as JwtClaims;
    } catch {
      return {};
    }
  }
}

export type { AuthResponse, AuthUser as TmsUser, LoginRequest } from './auth.model';
