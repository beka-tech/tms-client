import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { Student, StudentDraft } from '../../students.model';
import { apiErrorMessage } from '../../../../core/notifications/global-message.service';
import { StudentsStore } from '../../data-access/students.store';
import { TranscriptRequestComponent } from '../../../transcripts/ui/transcript-request/transcript-request';

type StudentDialogMode = 'add' | 'edit' | 'view' | 'delete' | null;

@Component({
  selector: 'tms-students',
  standalone: true,
  imports: [ReactiveFormsModule, TranscriptRequestComponent],
  templateUrl: './students.component.html',
  styleUrl: './students.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentsComponent {
  private readonly document = inject(DOCUMENT);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly data = inject(StudentsStore);
  protected readonly searchQuery = signal('');
  protected readonly dialogMode = signal<StudentDialogMode>(null);
  protected readonly selectedStudent = signal<Student | null>(null);
  protected readonly dialogError = signal('');
  protected readonly feedback = signal('');
  protected readonly operationPending = signal(false);

  protected readonly filteredStudents = computed(() => {
    const query = this.searchQuery().trim().toLocaleLowerCase();
    if (!query) {
      return this.data.students();
    }

    return this.data.students().filter((student) => {
      const searchableText = [
        student.registrationNumber,
        student.name,
        student.gpa.toFixed(1),
        student.active ? 'active yes' : 'inactive no',
      ]
        .join(' ')
        .toLocaleLowerCase();

      return searchableText.includes(query);
    });
  });

  protected readonly studentForm = this.formBuilder.nonNullable.group({
    registrationNumber: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(20),
        Validators.pattern(/^[A-Za-z0-9][A-Za-z0-9-]*$/),
      ],
    ],
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    gpa: [3, [Validators.required, Validators.min(0), Validators.max(4)]],
    active: [true],
  });

  private readonly dialogPanel = viewChild<ElementRef<HTMLElement>>('dialogPanel');
  private readonly modalFocusTarget = viewChild<ElementRef<HTMLElement>>('modalFocusTarget');
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  private previouslyFocusedElement: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const focusTarget = this.modalFocusTarget()?.nativeElement;
      if (focusTarget) {
        queueMicrotask(() => focusTarget.focus());
      }
    });
  }

  protected updateSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  protected clearSearch(): void {
    this.searchQuery.set('');
    this.searchInput()?.nativeElement.focus();
  }

  protected openAddDialog(): void {
    this.captureCurrentFocus();
    this.selectedStudent.set(null);
    this.dialogError.set('');
    this.studentForm.reset({
      registrationNumber: '',
      name: '',
      gpa: 3,
      active: true,
    });
    this.dialogMode.set('add');
  }

  protected openEditDialog(student: Student): void {
    this.captureCurrentFocus();
    this.selectedStudent.set(student);
    this.dialogError.set('');
    this.studentForm.reset({
      registrationNumber: student.registrationNumber,
      name: student.name,
      gpa: student.gpa,
      active: student.active,
    });
    this.dialogMode.set('edit');
  }

  protected openViewDialog(student: Student): void {
    this.captureCurrentFocus();
    this.selectedStudent.set(student);
    this.dialogMode.set('view');
  }

  protected openDeleteDialog(student: Student): void {
    this.captureCurrentFocus();
    this.selectedStudent.set(student);
    this.dialogMode.set('delete');
  }

  protected closeDialog(): void {
    if (!this.dialogMode()) {
      return;
    }

    this.dialogMode.set(null);
    this.selectedStudent.set(null);
    this.dialogError.set('');

    const focusTarget =
      this.previouslyFocusedElement?.isConnected === true
        ? this.previouslyFocusedElement
        : this.searchInput()?.nativeElement;
    this.previouslyFocusedElement = null;
    queueMicrotask(() => focusTarget?.focus());
  }

  protected saveStudent(): void {
    this.dialogError.set('');

    if (this.studentForm.invalid) {
      this.studentForm.markAllAsTouched();
      this.dialogError.set('Check the highlighted fields and try again.');
      return;
    }

    const mode = this.dialogMode();
    const selected = this.selectedStudent();
    if (mode !== 'add' && mode !== 'edit') {
      return;
    }
    if (mode === 'edit' && !selected) {
      return;
    }

    const rawValue = this.studentForm.getRawValue();
    const draft: StudentDraft = {
      registrationNumber: rawValue.registrationNumber.trim().toUpperCase(),
      name: rawValue.name.trim(),
      gpa: Number(rawValue.gpa),
      active: rawValue.active,
    };

    if (draft.name.length < 2) {
      this.studentForm.controls.name.setErrors({ trimmedMinLength: true });
      this.studentForm.controls.name.markAsTouched();
      this.dialogError.set('Enter a name with at least 2 characters.');
      return;
    }

    const conflictingStudent = this.data
      .students()
      .find(
        (student) =>
          student.id !== selected?.id &&
          student.registrationNumber.toLocaleLowerCase() ===
            draft.registrationNumber.toLocaleLowerCase(),
      );

    if (conflictingStudent) {
      this.dialogError.set('That registration number is already in use.');
      return;
    }

    const request =
      mode === 'add' ? this.data.addStudent(draft) : this.data.updateStudent(selected!.id, draft);
    this.operationPending.set(true);
    request.pipe(finalize(() => this.operationPending.set(false))).subscribe({
      next: (saved) => {
        this.feedback.set(
          mode === 'add' ? `${saved.name} was added.` : `${saved.name} was updated.`,
        );
        this.closeDialog();
      },
      error: (error: unknown) => this.dialogError.set(apiErrorMessage(error)),
    });
  }

  protected confirmDelete(): void {
    const student = this.selectedStudent();
    if (!student || this.dialogMode() !== 'delete') {
      return;
    }

    this.dialogError.set('');
    this.operationPending.set(true);
    this.data
      .deleteStudent(student.id)
      .pipe(finalize(() => this.operationPending.set(false)))
      .subscribe({
        next: () => {
          this.feedback.set(`${student.name} was deleted.`);
          this.closeDialog();
        },
        error: (error: unknown) => this.dialogError.set(apiErrorMessage(error)),
      });
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeDialog();
    }
  }

  protected onModalKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeDialog();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const panel = this.dialogPanel()?.nativeElement;
    if (!panel) {
      return;
    }

    const focusableElements = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );

    if (focusableElements.length === 0) {
      event.preventDefault();
      panel.focus();
      return;
    }

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];
    const activeElement = this.document.activeElement;

    if (event.shiftKey && (activeElement === first || !panel.contains(activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (activeElement === last || !panel.contains(activeElement))) {
      event.preventDefault();
      first.focus();
    }
  }

  private captureCurrentFocus(): void {
    const activeElement = this.document.activeElement;
    this.previouslyFocusedElement = activeElement instanceof HTMLElement ? activeElement : null;
  }
}
