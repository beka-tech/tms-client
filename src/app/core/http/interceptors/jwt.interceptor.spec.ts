import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { jwtInterceptor } from './jwt.interceptor';

describe('jwtInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let auth: {
    getAccessToken: ReturnType<typeof vi.fn>;
    getRefreshToken: ReturnType<typeof vi.fn>;
    refreshSession: ReturnType<typeof vi.fn>;
    expireSession: ReturnType<typeof vi.fn>;
  };
  let router: { url: string; navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    auth = {
      getAccessToken: vi.fn(() => 'old-token'),
      getRefreshToken: vi.fn(() => 'refresh-token'),
      refreshSession: vi.fn(() => of('new-token')),
      expireSession: vi.fn(),
    };
    router = { url: '/students', navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('adds the bearer token and retries a 401 with a refreshed token', () => {
    let response: { ok: boolean } | undefined;
    http.get<{ ok: boolean }>('/api/test').subscribe((value) => (response = value));

    const initial = controller.expectOne('/api/test');
    expect(initial.request.headers.get('Authorization')).toBe('Bearer old-token');
    initial.flush({}, { status: 401, statusText: 'Unauthorized' });

    const retry = controller.expectOne('/api/test');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer new-token');
    retry.flush({ ok: true });

    expect(response).toEqual({ ok: true });
    expect(auth.refreshSession).toHaveBeenCalledOnce();
    expect(auth.expireSession).not.toHaveBeenCalled();
  });

  it('expires the session when refresh fails', () => {
    auth.refreshSession.mockReturnValue(throwError(() => new Error('refresh failed')));
    http.get('/api/test').subscribe({ error: () => undefined });

    controller.expectOne('/api/test').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.expireSession).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/students' },
    });
  });
});
