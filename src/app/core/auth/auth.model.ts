export type UserRole = 'Student' | 'Instructor' | 'Administrator';

export interface AuthUser {
  id?: string;
  email: string;
  displayName: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user?: AuthUser;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthSession extends AuthTokens {
  user: AuthUser;
}

export function normalizeUserRole(value: unknown): UserRole {
  const role = String(value ?? '').toLowerCase();
  if (role === 'admin' || role === 'administrator') return 'Administrator';
  if (role === 'instructor' || role === 'teacher') return 'Instructor';
  return 'Student';
}
