import { test, expect } from '@playwright/test';

const mockCasais = [
  {
    id: 1,
    data_casamento: "2015-05-20",
    endereco: "Rua das Flores, 123",
    bairro: "Centro",
    cidade: "Brasília",
    cep: "70000-000",
    contato_emergencia_nome1: "Maria Auxiliadora",
    contato_emergencia_telefone1: "61988888888",
    pessoas: [
      {
        id: 1,
        tipo: "esposo",
        nome_completo: "José da Silva",
        nome_social: "José",
        data_nascimento: "1980-01-10",
        profissao: "Administrador",
        email: "jose@email.com",
        celular: "61999999999",
        rg: "1234567",
        rg_emissor: "SSP",
        cpf: "123.456.789-01",
        religiao: "católica"
      },
      {
        id: 2,
        tipo: "esposa",
        nome_completo: "Maria da Silva",
        nome_social: "Maria",
        data_nascimento: "1982-05-15",
        profissao: "Professora",
        email: "maria@email.com",
        celular: "61988888888",
        rg: "7654321",
        rg_emissor: "SSP",
        cpf: "987.654.321-00",
        religiao: "católica"
      }
    ],
    filhos: []
  }
];

const mockEventos = [
  {
    id: 101,
    nome: "ECC 2026",
    data_inicio: "2026-08-01T08:00:00",
    data_fim: "2026-08-03T18:00:00",
    local: "Paróquia São José",
    capacidade_maxima: 30,
    status: "inscricoes_abertas"
  }
];

const mockInscricoes = [
  {
    id: 1,
    casal_id: 1,
    evento_id: 101,
    status: "confirmada",
    tipo_participante: "convidado",
    quarto: "101",
    data_inscricao: "2026-06-01T10:00:00"
  }
];

test.describe('Testes de Usabilidade do Sistema Administração ECC', () => {

  test.beforeEach(async ({ page }) => {
    // Interceptar a API de autenticação
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Login realizado com sucesso',
          data: {
            token: 'fake-jwt-token-for-e2e',
            usuario: {
              id: 1,
              nome: 'Administrador Teste',
              email: 'seu@email.com'
            }
          }
        })
      });
    });

    await page.route('**/api/auth/verificar', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            usuario: {
              id: 1,
              nome: 'Administrador Teste',
              email: 'seu@email.com'
            }
          }
        })
      });
    });

    // Interceptar rotas de casais
    await page.route('**/api/casais', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockCasais)
        });
      } else if (route.request().method() === 'POST') {
        const payload = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { id: 2, ...payload } })
        });
      }
    });

    // Interceptar rotas de eventos
    await page.route('**/api/eventos', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockEventos)
      });
    });

    // Interceptar rotas de inscrições
    await page.route('**/api/inscricoes/evento/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockInscricoes)
      });
    });
  });

  test('Fluxo de Autenticação - Falha e Sucesso', async ({ page }) => {
    await page.goto('/login');

    // 1. Verificar interface inicial de Login (Usabilidade Visual)
    await expect(page.locator('h2')).toContainText('Administração ECC');
    await expect(page.locator('button[type="submit"]')).toBeDisabled();

    // 2. Usabilidade de Erros: Preencher email inválido e verificar se mostra erro
    await page.fill('#email', 'invalido');
    await page.locator('#senha').focus();
    await expect(page.locator('text=Email inválido')).toBeVisible();

    // 3. Preencher dados válidos
    await page.fill('#email', 'seu@email.com');
    await page.fill('#senha', '123456');

    // Botão de envio deve habilitar
    await expect(page.locator('button[type="submit"]')).toBeEnabled();

    // 4. Clicar no botão de submit
    await page.click('button[type="submit"]');

    // Deve redirecionar para a Dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h1')).toContainText('Visão Geral');
  });

  test('Dashboard e Navegação Lateral', async ({ page }) => {
    // Fazer login direto
    await page.goto('/login');
    await page.fill('#email', 'seu@email.com');
    await page.fill('#senha', '123456');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // Verificar se as estatísticas estão corretas e são legíveis
    await expect(page.locator('text=Total de Casais')).toBeVisible();
    await expect(page.locator('h3').nth(0)).toContainText('1'); // length of mockCasais is 1

    await expect(page.locator('text=Eventos Ativos')).toBeVisible();
    await expect(page.locator('h3').nth(1)).toContainText('1'); // length of mockEventos is 1

    // Testar link da sidebar para Lista de Cadastro
    await page.click('text=Casais Cadastrados');
    await expect(page).toHaveURL(/\/lista-cadastro/);
    await expect(page.locator('h2')).toContainText('Lista de Cadastro');

    // Testar link da sidebar para Inscrições
    await page.click('text=Inscrições');
    await expect(page).toHaveURL(/\/lista-incricao/);
    await expect(page.locator('h2')).toContainText('Inscrições do Evento');
  });

  test('Lista de Casais - Visualização e Busca', async ({ page }) => {
    // Ir direto para a lista de casais logado
    await page.goto('/login');
    await page.fill('#email', 'seu@email.com');
    await page.fill('#senha', '123456');
    await page.click('button[type="submit"]');
    await page.click('text=Casais Cadastrados');

    // Verificar se a tabela carregou o casal mockado
    await expect(page.locator('mat-row')).toHaveCount(1);
    await expect(page.locator('mat-cell').nth(1)).toContainText('José e Maria');

    // Testar usabilidade do filtro de busca
    const searchInput = page.locator('input[placeholder*="Pesquisar casal"]');
    await expect(searchInput).toBeVisible();

    // Digitar termo inexistente
    await searchInput.fill('Inexistente');
    await expect(page.locator('mat-row')).toHaveCount(0);
    await expect(page.locator('text=Nenhum casal cadastrado no sistema.')).toBeVisible();

    // Limpar busca
    await searchInput.fill('');
    await expect(page.locator('mat-row')).toHaveCount(1);
  });

  test('Formulário de Cadastro - Usabilidade do Multi-step Stepper e Envio', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'seu@email.com');
    await page.fill('#senha', '123456');
    await page.click('button[type="submit"]');
    await page.click('text=Novo Cadastro');

    await expect(page).toHaveURL(/\/registro/);

    // Passo 1: Dados do Esposo
    const stepEsposo = page.locator('mat-step').nth(0);
    await expect(stepEsposo.locator('text=Dados do Esposo')).toBeVisible();
    await stepEsposo.locator('input[formcontrolname="nome_completo"]').fill('Esposo Teste');
    await stepEsposo.locator('input[formcontrolname="nome_social"]').fill('Esposo');
    await stepEsposo.locator('mat-select[formcontrolname="religiao"]').click();
    await page.click('mat-option:has-text("católica")');
    await stepEsposo.locator('button:has-text("Próximo")').click();

    // Passo 2: Dados da Esposa
    const stepEsposa = page.locator('mat-step').nth(1);
    await expect(stepEsposa.locator('text=Dados da Esposa')).toBeVisible();
    await stepEsposa.locator('input[formcontrolname="nome_completo"]').fill('Esposa Teste');
    await stepEsposa.locator('input[formcontrolname="nome_social"]').fill('Esposa');
    await stepEsposa.locator('mat-select[formcontrolname="religiao"]').click();
    await page.click('mat-option:has-text("católica")');
    await stepEsposa.locator('button:has-text("Próximo")').click();

    // Passo 3: Dados do Casal
    const stepCasal = page.locator('mat-step').nth(2);
    await expect(stepCasal.locator('text=Dados Conjugais')).toBeVisible();
    await stepCasal.locator('input[formcontrolname="endereco"]').fill('Rua de Teste, 999');
    await stepCasal.locator('input[formcontrolname="cep"]').fill('70000-000');
    await stepCasal.locator('input[formcontrolname="bairro"]').fill('Bairro Teste');
    await stepCasal.locator('input[formcontrolname="cidade"]').fill('Cidade Teste');
    await stepCasal.locator('button:has-text("Próximo")').click();

    // Passo 4: Filhos
    const stepFilhos = page.locator('mat-step').nth(3);
    await expect(stepFilhos.locator('text=Filhos')).toBeVisible();
    await stepFilhos.locator('button:has-text("Próximo")').click();

    // Passo 5: Revisão
    const stepRevisao = page.locator('mat-step').nth(4);
    await expect(stepRevisao.locator('text=Revisão do Registro')).toBeVisible();
    await expect(stepRevisao.locator('text=Esposo: Esposo Teste')).toBeVisible();
    await expect(stepRevisao.locator('text=Esposa: Esposa Teste')).toBeVisible();

    // Clique em Enviar
    await stepRevisao.locator('button:has-text("Enviar Atualização")').click();

    // Deve exibir mensagem de sucesso
    await expect(page.locator('text=Registro atualizado com sucesso!')).toBeVisible();
  });
});
