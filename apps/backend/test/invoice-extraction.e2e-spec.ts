import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { InvoiceExtractor, OCRCoordinator } from '../src/modules/vendor-slip/domain/services';

jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue(Buffer.from('fake-file')),
}));

describe('Invoice Extraction (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtToken: string;
  let documentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideProvider(InvoiceExtractor)
    .useValue({
      extract: jest.fn().mockResolvedValue({
        vendorName: 'Vendor',
        invoiceNumber: '123',
        amount: 100,
        confidence: 0.95,
      })
    })
    .overrideProvider(OCRCoordinator)
    .useValue({
      runOCR: jest.fn().mockResolvedValue({
        text: 'Mocked OCR Text',
      })
    })
    .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    const jwtService = moduleFixture.get<JwtService>(JwtService);
    jwtToken = jwtService.sign({
      sub: 'test-user',
      roles: ['admin'],
      permissions: ['Invoice.Process'],
      companyId: 'company-1',
    });

    // Seed a document
    const doc = await prisma.document.create({
      data: {
        fileUrl: 'test-doc.pdf',
        status: 'UPLOADED',
        mimeType: 'application/pdf',
        organizationId: 'company-1',
        uploadedBy: 'test-user',
        checksum: '12345',
        source: 'EMAIL',
      },
    });
    documentId = doc.id;
  });

  afterAll(async () => {
    await prisma.document.deleteMany();
    await prisma.invoiceCandidate.deleteMany();
    await app.close();
  });

  it('TEST 1: Valid invoice upload -> OCR success, Candidate Created', async () => {
    const isAsync = process.env.USE_ASYNC_OCR === 'true';

    const response = await request(app.getHttpServer())
      .post(`/ocr/process/${documentId}`)
      .set('Authorization', `Bearer ${jwtToken}`);

    if (isAsync) {
      expect(response.status).toBe(200); // Created/Accepted (Nest defaults to 201 for POST)
      expect(response.body.status).toBe('ACCEPTED');
      
      // Wait for BullMQ worker to pick it up and process
      await new Promise(resolve => setTimeout(resolve, 3000));
    } else {
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('SUCCESS');
      expect(response.body.confidence).toBe(0.95);
    }

    const candidate = await prisma.invoiceCandidate.findUnique({
      where: { documentId },
    });
    expect(candidate).toBeDefined();
    expect(candidate?.extractedName).toBe('Vendor');
    expect(candidate?.total?.toNumber()).toBe(100);
  });
});
