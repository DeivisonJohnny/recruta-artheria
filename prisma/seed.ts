import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Verificar se o admin já existe
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@recrutaartheria.com' },
  });

  if (existingAdmin) {
    console.log('✅ Usuário admin já existe no banco de dados');
    console.log('📧 Email: admin@recrutaartheria.com');
    return;
  }

  // Criar usuário admin
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@recrutaartheria.com',
      name: 'Administrador',
      password: hashedPassword,
    },
  });

  console.log('✅ Usuário admin criado com sucesso!');
  console.log('📧 Email: admin@recrutaartheria.com');
  console.log('🔑 Senha: admin123');
  console.log('⚠️  IMPORTANTE: Altere a senha após o primeiro login!');
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
