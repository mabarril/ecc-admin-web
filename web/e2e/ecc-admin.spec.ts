import { test, expect } from '@playwright/test';

test.describe('ECC Admin Web - Fluxos E2E Críticos', () => {
  test('deve redirecionar usuário não autenticado para /login e validar campos obrigatórios', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText('Administração ECC')).toBeVisible();

    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText('O e-mail é obrigatório.')).toBeVisible();
  });

  test('deve manter sessão ao recarregar a página (F5) sem expulsar para /login', async ({
    page,
  }) => {
    await page.route('**/api/auth/verificar', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            usuario: {
              id: 1,
              nome: 'Admin E2E',
              email: 'admin@ecc.com.br',
            },
          },
        }),
      });
    });

    await page.route('**/api/casais', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/eventos', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            nome: 'ECC 2026',
            data_inicio: '2026-08-01',
            data_fim: '2026-08-03',
          },
        ]),
      });
    });

    await page.route('**/api/inscricoes/evento/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('token', 'fake-jwt-token-e2e');
    });

    await page.goto('/dashboard');
    await expect(page.getByText('Visão Geral')).toBeVisible();
    await expect(page.getByText('Admin E2E').first()).toBeVisible();

    // Redirecionamento legado /lista-incricao -> /lista-inscricao
    await page.goto('/lista-incricao');
    await expect(page).toHaveURL(/\/lista-inscricao/);
    await expect(page.getByText('Inscrições do Evento')).toBeVisible();
  });
});
