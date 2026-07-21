import { PrismaClient } from '@prisma/client';
import { StudentStatus, AdmissionStatus, Gender } from '../src/modules/student/constants/student.constants';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  const student = await prisma.student.upsert({
    where: { admissionNumber: 'ADM-2026-001' },
    update: {},
    create: {
      admissionNumber: 'ADM-2026-001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '1234567890',
      dateOfBirth: new Date('2010-01-01'),
      gender: Gender.MALE,
      status: StudentStatus.ACTIVE,
      admissionStatus: AdmissionStatus.APPROVED,
    },
  });

  console.log({ student });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
