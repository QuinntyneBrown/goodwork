import { Routes } from '@angular/router';
import { HomePage } from './home/home-page';

export const routes: Routes = [
  { path: '', component: HomePage, title: 'Goodwork · Software for people doing good work' },
  { path: '**', redirectTo: '' },
];
