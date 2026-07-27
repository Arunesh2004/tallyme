import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

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
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    
    const jwtService = moduleFixture.get<JwtService>(JwtService);
    jwtToken = jwtService.sign({ sub: 'test-user', roles: ['admin'], companyId: 'company-1' });

    // Seed a document
    const doc = await prisma.document.create({
      data: {
        fileUrl: 'test-doc.pdf',
        status: 'UPLOADED',
        mimeType: 'application/pdf',
        organizationId: 'company-1',
        uploadedBy: 'test-user',
        checksum: '12345',
        source: 'EMAIL'
      }
    });
    documentId = doc.id;
  });

  afterAll(async () => {
    await prisma.document.deleteMany();
    await prisma.invoiceCandidate.deleteMany();
    await app.close();
  });

  it('TEST 1: Valid invoice upload -> OCR success, Candidate Created', async () => {
    mockedAxios.post
      .mockResolvedValueOnce({
        data: { choices: [{ message: { content: 'OCR Text' } }] },
      })
      .mockResolvedValueOnce({
        data: { choices: [{ message: { content: JSON.stringify({ vendorName: 'Vendor', invoiceNumber: '123', amount: 100, confidence: 0.95 }) } }] },
      });

    const response = await request(app.getHttpServer())
      .post(`/ocr/process/${documentId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    expect(response.body.status).toBe('SUCCESS');
    expect(response.body.confidence).toBe(0.95);

    const candidate = await prisma.invoiceCandidate.findUnique({
      where: { documentId }
    });
    expect(candidate).toBeDefined();
    expect(candidate?.extractedName).toBe('Vendor');
    expect(candidate?.total?.toNumber()).toBe(100);
  });
});
