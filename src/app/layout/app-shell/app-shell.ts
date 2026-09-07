import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { GlobalMessageService } from '../../core/notifications/global-message.service';
import { LiveSyncService } from '../../core/realtime/live-sync';
import { ApplicationDataCoordinator } from '../../application/application-data.coordinator';

@Component({
  selector: 'tms-app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly data = inject(ApplicationDataCoordinator);
  protected readonly liveSync = inject(LiveSyncService);
  protected readonly globalMessages = inject(GlobalMessageService);

  readonly menuOpen = signal(false);
  protected readonly canManageStudents = computed(() => this.auth.hasRole('Administrator'));
  protected readonly canManageEnrollments = computed(
    () => this.auth.hasRole('Instructor') || this.auth.hasRole('Administrator'),
  );
  protected readonly canManageCertificates = computed(() => this.auth.hasRole('Administrator'));
  protected readonly connectionLabel = computed(() => {
    switch (this.liveSync.connectionState()) {
      case 'connected':
        return 'Live updates on';
      case 'connecting':
        return 'Connecting';
      case 'reconnecting':
        return 'Reconnecting';
      default:
        return 'Updates offline';
    }
  });
  readonly today = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  constructor() {
    effect(() => {
      const role = this.auth.role();
      if (this.auth.isAuthenticated() && role) {
        this.data.loadForRole(role);
        void this.liveSync.connect();
      } else {
        void this.liveSync.stop();
      }
    });
  }

  get displayName(): string {
    return this.auth.currentUser()?.displayName ?? 'TMS User';
  }

  get role(): string {
    return this.auth.currentUser()?.role ?? 'Signed in';
  }

  get initials(): string {
    return this.displayName
      .split(' ')
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
