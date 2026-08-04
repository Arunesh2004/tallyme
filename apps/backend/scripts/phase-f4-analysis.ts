import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

async function analysis() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const candidates = await prisma.invoiceCandidate.findMany({
    where: { id: { in: ['val-cand-1785483707538', 'val-cand-1785483723334', 'val-cand-1785483727241'] } }
  });

  for (const c of candidates) {
    console.log('======', c.id, '======');
    console.log(JSON.stringify(c.extractedData, null, 2));
  }
  await app.close();
}
analysis().catch(console.error);
