import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { AuthSession, AuthTokens, AuthUser, UserRole, normalizeUserRole } from './auth.model';

const SESSION_KEY = 'tms.auth.session';

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly sessionState = signal<AuthSession | null>(this.restoreSession());

  readonly session = this.sessionState.asReadonly();
  readonly accessToken = computed(() => this.sessionState()?.accessToken ?? null);
  readonly refreshToken = computed(() => this.sessionState()?.refreshToken ?? null);
  readonly currentUser = computed(() => this.sessionState()?.user ?? null);
  readonly role = computed(() => this.sessionState()?.user.role ?? null);
  readonly isAuthenticated = computed(() =>
    Boolean(this.accessToken() && this.refreshToken() && this.currentUser()),
  );

  setSession(tokens: AuthTokens, user: AuthUser): void {
    const session: AuthSession = { ...tokens, user };
    this.sessionState.set(session);
    this.persistSession(session);
  }

  updateTokens(tokens: AuthTokens, user = this.currentUser()): void {
    if (!user) return;
    this.setSession(tokens, user);
  }

  setCurrentUser(user: AuthUser): void {
    const session = this.sessionState();
    if (!session) return;
    this.setSession(session, user);
  }

  hasAnyRole(...roles: readonly UserRole[]): boolean {
    const currentRole = this.role();
    return currentRole !== null && roles.includes(currentRole);
  }

  clear(): void {
    this.sessionState.set(null);
    if (isPlatformBrowser(this.platformId)) sessionStorage.removeItem(SESSION_KEY);
  }

  private restoreSession(): AuthSession | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const rawSession = sessionStorage.getItem(SESSION_KEY);
      if (!rawSession) return null;
      const session = JSON.parse(rawSession) as Partial<AuthSession>;
      if (
        typeof session.accessToken !== 'string' ||
        typeof session.refreshToken !== 'string' ||
        !session.user ||
        typeof session.user.email !== 'string'
      ) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return {
        ...(session as AuthSession),
        user: {
          ...(session.user as AuthUser),
          role: normalizeUserRole(session.user.role),
        },
      };
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  private persistSession(session: AuthSession): void {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  }
}
