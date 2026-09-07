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
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { CourseDraft } from '../../courses.model';
import { apiErrorMessage } from '../../../../core/notifications/global-message.service';
import { CoursesFacade } from '../../data-access/courses.facade';

@Component({
  selector: 'tms-courses',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './courses.html',
  styleUrl: './courses.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoursesComponent {
  private readonly document = inject(DOCUMENT);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly data = inject(CoursesFacade);
  protected readonly searchQuery = signal('');
  protected readonly addDialogOpen = signal(false);
  protected readonly dialogError = signal('');
  protected readonly feedback = signal('');
  protected readonly operationPending = signal(false);

  protected readonly courseRows = computed(() => {
    const query = this.searchQuery().trim().toLocaleLowerCase();

    return this.data
      .courses()
      .filter((course) => {
        if (!query) {
          return true;
        }

        return [course.code, course.title].join(' ').toLocaleLowerCase().includes(query);
      })
      .map((course) => ({
        course,
        students: this.data.enrollmentCount(course.id),
      }));
  });

  protected readonly courseForm = this.formBuilder.nonNullable.group({
    code: [
      '',
      [Validators.required, Validators.maxLength(7), Validators.pattern(/^[A-Za-z]{3}-\d{3}$/)],
    ],
    title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    capacity: [25, [Validators.required, Validators.min(1), Validators.max(200)]],
  });

  private readonly dialogPanel = viewChild<ElementRef<HTMLElement>>('dialogPanel');
  private readonly modalFocusTarget = viewChild<ElementRef<HTMLInputElement>>('modalFocusTarget');
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
    const activeElement = this.document.activeElement;
    this.previouslyFocusedElement = activeElement instanceof HTMLElement ? activeElement : null;
    this.dialogError.set('');
    this.courseForm.reset({
      code: '',
      title: '',
      capacity: 25,
    });
    this.addDialogOpen.set(true);
  }

  protected closeAddDialog(): void {
    if (!this.addDialogOpen()) {
      return;
    }

    this.addDialogOpen.set(false);
    this.dialogError.set('');
    const focusTarget =
      this.previouslyFocusedElement?.isConnected === true
        ? this.previouslyFocusedElement
        : this.searchInput()?.nativeElement;
    this.previouslyFocusedElement = null;
    queueMicrotask(() => focusTarget?.focus());
  }

  protected addCourse(): void {
    this.dialogError.set('');

    if (this.courseForm.invalid) {
      this.courseForm.markAllAsTouched();
      this.dialogError.set('Check the highlighted fields and try again.');
      return;
    }

    const value = this.courseForm.getRawValue();
    const draft: CourseDraft = {
      code: value.code.trim().toUpperCase(),
      title: value.title.trim(),
      capacity: Number(value.capacity),
    };

    const duplicate = this.data
      .courses()
      .some((course) => course.code.toLocaleLowerCase() === draft.code.toLocaleLowerCase());
    if (duplicate) {
      this.dialogError.set('A course with that code already exists.');
      return;
    }

    this.operationPending.set(true);
    this.data
      .addCourse(draft)
      .pipe(finalize(() => this.operationPending.set(false)))
      .subscribe({
        next: (created) => {
          this.feedback.set(`${created.code} · ${created.title} was added.`);
          this.closeAddDialog();
        },
        error: (error: unknown) => this.dialogError.set(apiErrorMessage(error)),
      });
  }

  protected capacityPercent(students: number, capacity: number): number {
    return capacity > 0 ? Math.min(100, Math.round((students / capacity) * 100)) : 0;
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeAddDialog();
    }
  }

  protected onModalKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeAddDialog();
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
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
}
