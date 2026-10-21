import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // Planes de suscripción
  const planes = await Promise.all([
    prisma.plan.upsert({
      where: { id: 'plan-esencial' },
      update: {},
      create: {
        id: 'plan-esencial',
        nombre: 'Esencial',
        maxEquipos: 7,
        maxSedes: 1,
        maxUsuarios: 5,
        precioMensual: 0,
        activo: true,
      },
    }),
    prisma.plan.upsert({
      where: { id: 'plan-control' },
      update: {},
      create: {
        id: 'plan-control',
        nombre: 'Control',
        maxEquipos: 20,
        maxSedes: 1,
        maxUsuarios: 10,
        precioMensual: 49900,
        activo: true,
      },
    }),
    prisma.plan.upsert({
      where: { id: 'plan-empresarial' },
      update: {},
      create: {
        id: 'plan-empresarial',
        nombre: 'Empresarial',
        maxEquipos: 50,
        maxSedes: 3,
        maxUsuarios: 25,
        precioMensual: 129900,
        activo: true,
      },
    }),
  ]);

  console.log(`✅ Planes creados: ${planes.map((p) => p.nombre).join(', ')}`);

  // Empresa demo
  const empresa = await prisma.empresa.upsert({
    where: { id: 'empresa-demo' },
    update: {},
    create: {
      id: 'empresa-demo',
      nombre: 'Empresa Demo S.A.S',
      nit: '900123456-7',
      emailContacto: 'admin@empresa-demo.com',
      telefono: '3001234567',
      planId: 'plan-control',
      activa: true,
    },
  });

  // Configuración de la empresa
  await prisma.configuracionEmpresa.upsert({
    where: { empresaId: empresa.id },
    update: {},
    create: {
      empresaId: empresa.id,
      notifEmail: true,
      diasAvisoMantenimiento: 7,
    },
  });

  // Sede principal
  const sede = await prisma.sede.upsert({
    where: { id: 'sede-principal' },
    update: {},
    create: {
      id: 'sede-principal',
      empresaId: empresa.id,
      nombre: 'Sede Principal',
      direccion: 'Calle 123 #45-67',
      ciudad: 'Bogotá',
      activa: true,
    },
  });

  // Ubicaciones
  await prisma.ubicacion.createMany({
    data: [
      { id: 'ubic-1', sedeId: sede.id, nombre: 'Oficina Gerencia' },
      { id: 'ubic-2', sedeId: sede.id, nombre: 'Sala de Sistemas' },
      { id: 'ubic-3', sedeId: sede.id, nombre: 'Recepción' },
    ],
    skipDuplicates: true,
  });

  // Usuario administrador demo
  const passwordHash = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@empresa-demo.com' },
    update: {},
    create: {
      empresaId: empresa.id,
      nombre: 'Administrador Demo',
      email: 'admin@empresa-demo.com',
      passwordHash,
      rol: 'administrador',
      activo: true,
    },
  });

  console.log(`✅ Empresa demo creada: ${empresa.nombre}`);
  console.log(`✅ Admin demo: ${admin.email} / Admin123!`);
  console.log('🌱 Seed completado!');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
