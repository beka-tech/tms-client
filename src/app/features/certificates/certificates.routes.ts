import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/certificates-page/certificates.component').then(
        (m) => m.CertificatesComponent,
      ),
  },
];
