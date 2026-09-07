import { Component, computed, inject, input } from '@angular/core';
import { TranscriptStatus } from '../../transcripts.model';
import { TranscriptWorkflowService } from '../../data-access/transcript-workflow.service';

@Component({
  selector: 'tms-transcript-request',
  standalone: true,
  templateUrl: './transcript-request.html',
  styleUrl: './transcript-request.scss',
})
export class TranscriptRequestComponent {
  readonly studentId = input.required<number>();
  readonly studentName = input.required<string>();
  protected readonly workflow = inject(TranscriptWorkflowService);

  protected readonly report = computed(() => {
    const report = this.workflow.report();
    return report?.studentId === this.studentId() ? report : null;
  });

  protected requestTranscript(): void {
    this.workflow.request(this.studentId());
  }

  protected statusDescription(status: TranscriptStatus): string {
    switch (status) {
      case 'Queued':
        return 'Your request is in the report queue.';
      case 'Processing':
        return 'The transcript is being assembled.';
      case 'Completed':
        return 'The transcript is ready to download.';
      case 'Failed':
        return 'The report could not be generated.';
    }
  }
}
