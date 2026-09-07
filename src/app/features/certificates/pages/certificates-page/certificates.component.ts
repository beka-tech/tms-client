import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { apiErrorMessage } from '../../../../core/notifications/global-message.service';
import { CertificatesFacade } from '../../data-access/certificates.facade';

interface Feedback {
  kind: 'success' | 'error';
  message: string;
}

@Component({
  selector: 'app-certificates',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './certificates.component.html',
  styleUrl: './certificates.component.scss',
})
export class CertificatesComponent {
  protected readonly data = inject(CertificatesFacade);

  protected readonly searchTerm = signal('');
  protected readonly issueDialogOpen = signal(false);
  protected readonly selectedEnrollmentId = signal('');
  protected readonly feedback = signal<Feedback | null>(null);
  protected readonly operationPending = signal(false);

  protected readonly certificateRows = this.data.certificateRows;

  protected readonly filteredRows = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase();
    if (!query) {
      return this.certificateRows();
    }

    return this.certificateRows().filter(
      ({ certificate, studentName, courseTitle }) =>
        certificate.serial.toLocaleLowerCase().includes(query) ||
        studentName.toLocaleLowerCase().includes(query) ||
        courseTitle.toLocaleLowerCase().includes(query),
    );
  });

  protected readonly eligibleEnrollments = this.data.eligibleEnrollments;

  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected updateEnrollmentSelection(event: Event): void {
    this.selectedEnrollmentId.set((event.target as HTMLSelectElement).value);
    this.feedback.set(null);
  }

  protected openIssueDialog(): void {
    this.selectedEnrollmentId.set('');
    this.feedback.set(null);
    this.issueDialogOpen.set(true);
  }

  protected closeIssueDialog(): void {
    this.issueDialogOpen.set(false);
    this.selectedEnrollmentId.set('');
    if (this.feedback()?.kind === 'error') {
      this.feedback.set(null);
    }
  }

  protected issueCertificate(event: Event): void {
    event.preventDefault();

    const enrollmentId = this.selectedEnrollmentId();
    if (!enrollmentId) {
      this.feedback.set({ kind: 'error', message: 'Choose an eligible enrollment first.' });
      return;
    }

    this.operationPending.set(true);
    this.data
      .issueCertificate(enrollmentId)
      .pipe(finalize(() => this.operationPending.set(false)))
      .subscribe({
        next: () => {
          this.feedback.set({ kind: 'success', message: 'Certificate issued successfully.' });
          this.issueDialogOpen.set(false);
          this.selectedEnrollmentId.set('');
        },
        error: (error: unknown) =>
          this.feedback.set({ kind: 'error', message: apiErrorMessage(error) }),
      });
  }
}
