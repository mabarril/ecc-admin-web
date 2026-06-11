import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { authGuard } from './guards/auth.guard';
import { ListaInscricao } from './components/lista-inscricao/lista-inscricao';
import { FormCadastro } from './components/form-cadastro/form-cadastro';
import { ListaCadastro } from './components/lista-cadastro/lista-cadastro';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'lista-incricao', component: ListaInscricao, canActivate: [authGuard]  },
  { path: 'registro', component: FormCadastro, canActivate: [authGuard]  },
  { path: 'registro/:id', component: FormCadastro, canActivate: [authGuard]  },
  { path: 'lista-cadastro', component: ListaCadastro, canActivate: [authGuard]  },
  { path: '**', redirectTo: '/dashboard' }
];

