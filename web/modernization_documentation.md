# Documentação de Modernização - Administração ECC

Este documento descreve as alterações arquiteturais, tecnológicas e visuais implementadas para modernizar o sistema **Administração ECC**, saindo de uma interface baseada em Angular Material clássico (tema claro, rígido e azul) para um design **minimalista, premium e funcional em modo escuro**.

---

## 🛠️ Stack Tecnológica Implementada

1. **Tailwind CSS v4**: Integrado à compilação global do Angular para criação rápida de classes de layout, espaçamento, sombras e efeitos especiais.
2. **PostCSS**: Adicionado `.postcssrc.json` com o plugin `@tailwindcss/postcss` para processar a compilação do Tailwind v4.
3. **Tipografia Premium**: Substituição da fonte Roboto clássica pelas fontes **Inter** e **Outfit** importadas do Google Fonts, melhorando significativamente a legibilidade e a estética da interface.
4. **CSS Overrides Globais**: Customização direta das classes internas do Angular Material para adaptar todos os componentes originais (tabelas, selects, autocompletes, modais e steppers) ao visual do novo tema.

---

## 🗺️ Alterações Estruturais e de Layout

### 1. Novo Layout de Navegação Lateral (`app.component`)
* Substituição da antiga barra superior por um **menu lateral (sidebar) responsivo e translúcido (glassmorphism)**.
* Adição de cabeçalho superior contendo um campo de busca simulado, indicador de notificações e área de perfil do usuário.
* Arquivos afetados:
  * [src/app/app.html](src/app/app.html) (Estrutura do layout flexbox com sidebar e área principal)
  * [src/app/app.ts](src/app/app.ts) (Inclusão das diretivas de rota para o menu)
  * [src/app/app.scss](src/app/app.scss) (Limpeza de regras legadas)

### 2. Tela de Login Moderna (`login.component`)
* Substituição da caixa de login tradicional por um cartão com efeito translúcido (*glassmorphic card*) flutuando sobre um fundo escuro decorado com degradês abstratos animados de forma pulsante.
* Utilização de campos de entrada customizados nativos com contornos sutis e foco destacado em indigo.
* Arquivos afetados:
  * [src/app/components/login/login.component.html](src/app/components/login/login.component.html)
  * [src/app/components/login/login.component.scss]

### 3. Painel Geral Inteligente (`dashboard.component`)
* Apresentação de cartões de estatísticas flutuantes com ícones integrados e badges de crescimento (+12% / +8%).
* Inclusão de um gráfico de linhas duplo elegante feito com vetores SVG na seção **"Inscrições por ECC"**, detalhando o histórico das últimas três edições (ECC 2024, 2025, 2026).
* Adição de painel de ações rápidas para navegação rápida e feed visual para atividades recentes.
* Arquivos afetados:
  * [src/app/components/dashboard/dashboard.component.html](src/app/components/dashboard/dashboard.component.html)
  * [src/app/components/dashboard/dashboard.component.scss]

### 4. Tabelas e Listagens Modernizadas (`lista-cadastro` e `lista-inscricao`)
* Substituição das antigas tabelas por layouts transparentes integrados ao fundo do sistema.
* Criação de botões de ação compactos no formato de pílulas para copiar URLs de inscrição, editar cadastros, emitir PDFs e excluir registros.
* Implementação de inputs de busca integrados e nativos no estilo pílula com ícones internos.
* Arquivos afetados:
  * [src/app/components/lista-cadastro/lista-cadastro.html](src/app/components/lista-cadastro/lista-cadastro.html)
  * [src/app/components/lista-inscricao/lista-inscricao.html](src/app/components/lista-inscricao/lista-inscricao.html)
  * [src/app/components/lista-cadastro/lista-cadastro.scss]
  * [src/app/components/lista-inscricao/lista-inscricao.scss]

### 5. Formulário de Cadastro (`form-cadastro`)
* Ajuste no formulário de etapas para adotar a mesma estética escura, alterando as caixas internas de cadastro de esposos/filhos para cinza translúcido sutil e roxo/indigo para o progresso do stepper.
* Arquivos afetados:
  * [src/app/components/form-cadastro/form-cadastro.scss](src/app/components/form-cadastro/form-cadastro.scss)

---

## 🎨 Guia de Customização e Overrides Globais (`styles.scss`)

Todas as customizações de bibliotecas de terceiros estão concentradas em [src/styles.scss](src/styles.scss):

* **Inputs do Material (`mat-form-field` estilo Login Premium)**:
  * O outline quebrado padrão (`notch`) é removido da visualização. A caixa inteira do text-field é estilizada com bordas contínuas, arredondamento `12px` e fundo translúcido.
  * A label flutuante (`.mdc-floating-label`) é fixada no topo esquerdo externo do campo de entrada (`transform: translateY(-24px) scale(0.9)`).
  * Todos os containers internos têm `overflow: visible` para evitar cortes nas letras dos labels superiores.
* **Tabelas (`mat-table`)**:
  * Fundo totalmente transparente. Borda inferior de cada linha em cinza translúcido sutil (`rgba(255, 255, 255, 0.05)`).
* **Dropdowns e Modais (`mat-menu`, `mat-select` e `mat-autocomplete`)**:
  * Painéis e caixas suspensas usam fundo escuro (`rgba(15, 18, 30, 0.98)`), filtro de desfoque de fundo (*backdrop-blur*) e borda sutil. As opções de texto têm cor cinza claro, com realce roxo/indigo na seleção.
* **Modais Dialog (`mat-dialog`)**:
  * Redefinição de padding duplo para centralizar o conteúdo do modal de forma elegante e limpa.

---

## 🚀 Como Rodar o Servidor Local

1. Instale as novas dependências se necessário:
   ```bash
   npm install
   ```
2. Inicialize o servidor de desenvolvimento:
   ```bash
   npm start
   ```
   A aplicação estará disponível em `http://localhost:4200/`.
