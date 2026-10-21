import app from './app';
import { config } from './config';

import cron from 'node-cron';

const startServer = async () => {
  if (!config.demoMode) {
    const { prisma } = await import('./config/database');
    // Verificar conexión a la base de datos
    try {
      await prisma.$connect();
      console.log('✅ Conexión a PostgreSQL establecida');
    } catch (err) {
      console.error('❌ Error conectando a PostgreSQL:', err);
      process.exit(1);
    }

    // Cron job: verificar mantenimientos vencidos (cada día a las 7:00 AM)
    cron.schedule('0 7 * * *', async () => {
      console.log('⏰ Ejecutando verificación de mantenimientos vencidos...');
      try {
        const vencidos = await prisma.mantenimiento.updateMany({
          where: {
            estado: 'programado',
            fechaProgramada: { lt: new Date() },
          },
          data: { estado: 'vencido' },
        });
        if (vencidos.count > 0) {
          console.log(`⚠️  ${vencidos.count} mantenimientos marcados como vencidos`);
        }
      } catch (err) {
        console.error('Error en cron de mantenimientos:', err);
      }
    }, { timezone: 'America/Bogota' });

  }

  app.listen(config.port, config.demoMode ? '127.0.0.1' : '0.0.0.0', () => {
    console.log(`\n🚀 Preventix API corriendo en http://localhost:${config.port}`);
    console.log(`📋 Entorno: ${config.nodeEnv} · ${config.demoMode ? 'sustentación con archivo local' : 'PostgreSQL'}`);
    console.log(`🔗 Health check: http://localhost:${config.port}/health\n`);
  });
};

startServer().catch(error => { console.error('No se pudo iniciar Preventix:', error); process.exit(1); });

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM recibido, cerrando servidor...');
  if (!config.demoMode) { const { prisma } = await import('./config/database'); await prisma.$disconnect(); }
  process.exit(0);
});
