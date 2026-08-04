import { Test, TestingModule } from '@nestjs/testing';
import { GeminiClientService } from './gemini-client.service';
import { ConfigService } from '@nestjs/config';

describe('GeminiClientService', () => {
  let service: GeminiClientService;
  
  const mockConfig = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockConfig.get.mockImplementation((key) => {
      if (key === 'ai.apiKey') return 'fake-api-key';
      if (key === 'ai.model') return 'gemini-1.5-pro';
      return null;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiClientService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<GeminiClientService>(GeminiClientService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(service.ai).toBeDefined();
    expect(service.model).toBe('gemini-1.5-pro');
  });

  it('should fallback to models/gemini-flash-lite-latest if model not configured', async () => {
    mockConfig.get.mockImplementation((key) => {
      if (key === 'ai.apiKey') return 'fake-api-key';
      if (key === 'ai.model') return undefined;
      return null;
    });

    const module2: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiClientService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    const service2 = module2.get<GeminiClientService>(GeminiClientService);
    expect(service2.model).toBe('models/gemini-flash-lite-latest');
  });
});
