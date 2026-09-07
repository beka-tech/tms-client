import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/course-list/courses').then((m) => m.CoursesComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/course-detail/course-detail').then((m) => m.CourseDetailComponent),
  },
];
