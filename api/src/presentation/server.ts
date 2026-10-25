import 'dotenv/config';
import { buildApp, createInMemoryDependencies } from './app.js';
import { db } from '../infrastructure/db/client.js';
import {
  DrizzleCasalRepository,
  DrizzleEventoRepository,
  DrizzleInscricaoRepository,
  DrizzleUrlUnicaRepository,
  DrizzleUsuarioRepository,
} from '../infrastructure/repositories/drizzle-repositories.js';

async function start() {
  const useInMemory = process.env.USE_IN_MEMORY_DB === 'true';

  const deps = useInMemory
    ? createInMemoryDependencies()
    : {
        usuarioRepo: new DrizzleUsuarioRepository(db),
        casalRepo: new DrizzleCasalRepository(db),
        eventoRepo: new DrizzleEventoRepository(db),
        inscricaoRepo: new DrizzleInscricaoRepository(db),
        urlUnicaRepo: new DrizzleUrlUnicaRepository(db),
      };

  const app = await buildApp(deps);
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '0.0.0.0';

  try {
    await app.listen({ port, host });
    console.log(`ECC API rodando em http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
