import { db, queryClient } from './client.js';
import { eventos, usuarios } from './schema.js';
import { hashPassword } from '../security/password.js';
import { eq } from 'drizzle-orm';

async function runSeed() {
  console.log('Iniciando seed do banco de dados ECC...');

  const adminEmail = 'admin@ecc.com.br';
  const existingAdmin = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.email, adminEmail))
    .limit(1);

  if (existingAdmin.length === 0) {
    const senha_hash = await hashPassword('admin123');
    await db.insert(usuarios).values({
      nome: 'Administrador ECC',
      email: adminEmail,
      senha_hash,
    });
    console.log('Usuário padrão criado: admin@ecc.com.br (senha: admin123)');
  }

  const existingEventos = await db.select().from(eventos).limit(1);
  if (existingEventos.length === 0) {
    await db.insert(eventos).values({
      nome: 'ECC 2026 - 1ª Edição',
      data_inicio: '2026-08-01',
      data_fim: '2026-08-03',
      ativo: true,
    });
    console.log('Evento padrão criado: ECC 2026 - 1ª Edição');
  }

  await queryClient.end();
  console.log('Seed concluído com sucesso.');
}

runSeed().catch((err) => {
  console.error('Erro ao executar seed:', err);
  process.exit(1);
});
