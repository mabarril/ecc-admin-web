# ECC Admin — Painel Administrativo Full-Stack (`ecc-admin-web`)

Sistema administrativo web e API para gestão do **Encontro de Casais com Cristo (ECC — Brasília/DF)**, construído sobre **Clean Architecture**, **TypeScript Strict**, **React 19 + Vite + Tailwind CSS v4** no Front-end e **Node.js 22 + Fastify 5 + Drizzle ORM + PostgreSQL 17 + Zod/OpenAPI** no Back-end.

---

## Arquitetura do Monorepo

- **[`api/`](file:///data/data/com.termux/files/home/ecc-admin-web/api)**: Back-end RESTful em Node.js 22 + Fastify 5 + Drizzle ORM + PostgreSQL 17, validação de contratos Zod e documentação interativa OpenAPI 3.1 em `/api/docs`.
- **[`web/`](file:///data/data/com.termux/files/home/ecc-admin-web/web)**: Front-end SPA em React 19 + Vite 6 + Tailwind CSS v4 + TanStack Query + React Hook Form/Zod + motores de exportação PDF (`jsPDF`) e Excel (`xlsx`) carregados sob demanda.
- **[`docker-compose.yml`](file:///data/data/com.termux/files/home/ecc-admin-web/docker-compose.yml)**: Orquestração completa de produção (`ecc-db`, `ecc-api`, `ecc-web`).
- **[`docker-compose.dev.yml`](file:///data/data/com.termux/files/home/ecc-admin-web/docker-compose.dev.yml)**: Ambiente de desenvolvimento containerizado com hot-reload.

---

## Como Executar com Docker Compose (Recomendado)

### 1. Produção (PostgreSQL 17 + API Fastify + Nginx/React)
```bash
docker compose up --build -d
```
- **Painel Web**: `http://localhost`
- **API Healthcheck**: `http://localhost:3000/api/health`
- **Documentação Swagger/OpenAPI**: `http://localhost:3000/api/docs`

### 2. Desenvolvimento com Hot-Reload
```bash
docker compose -f docker-compose.dev.yml up
```
- **Front-end Vite (`4200`)**: `http://localhost:4200`
- **API Fastify (`3000`)**: `http://localhost:3000`
- **Credenciais padrão (Seed/In-Memory)**: `admin@ecc.com.br` / `admin123`

---

## Testes Automatizados

### Back-end (`api/`)
```bash
cd api
npm install
npm test
```

### Front-end (`web/`)
```bash
cd web
npm install
npm test          # Testes Unitários e de Domínio (Vitest)
npm run test:e2e  # Testes End-to-End (Playwright)
```
