import { app } from './app';
import { config } from './config';
import { runMigrations } from './database/migrate';
import { seedDatabase } from './database/seed';
import { db } from './database/db';

async function bootstrap() {
  try {
    console.log('[Server] Starting Institute LMS Backend...');

    // Auto-apply migrations and seed default administrative account
    await runMigrations();
    await seedDatabase();

    const server = app.listen(config.port, () => {
      console.log(`[Server] LMS API Server is running on http://localhost:${config.port}`);
      console.log(`[Server] Environment: ${config.nodeEnv}`);
    });

    const shutdown = async (signal: string) => {
      console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await db.close();
        console.log('[Server] Database connections closed. Process exited.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('[Server] Fatal startup error:', err);
    process.exit(1);
  }
}

bootstrap();
