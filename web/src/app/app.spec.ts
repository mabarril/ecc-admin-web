import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { AuthService } from './services/auth.service';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';

describe('App', () => {
  let authServiceSpy: any;
  let routerSpy: any;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['logout', 'getCurrentUser']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    authServiceSpy.getCurrentUser.and.returnValue(null);

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        provideRouter([])
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render router outlet and no sidebar when not logged in', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
    expect(compiled.querySelector('aside')).toBeFalsy();
  });

  it('should render sidebar when logged in', () => {
    authServiceSpy.getCurrentUser.and.returnValue({ id: 1, nome: 'Test Admin', email: 'test@email.com' });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('aside')).toBeTruthy();
    expect(compiled.querySelector('h1')?.textContent).toContain('Administração');
  });
});

