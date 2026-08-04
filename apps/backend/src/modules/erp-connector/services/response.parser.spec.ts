import { Test, TestingModule } from '@nestjs/testing';
import { ERPResponseParser } from './response.parser';

describe('ERPResponseParser', () => {
  let parser: ERPResponseParser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ERPResponseParser],
    }).compile();

    parser = module.get<ERPResponseParser>(ERPResponseParser);
  });

  it('should be defined', () => {
    expect(parser).toBeDefined();
  });

  describe('parseAndValidate', () => {
    it('should parse and validate response using adapter', () => {
      const mockAdapter: any = {
        parseResponse: jest.fn().mockReturnValue({ data: 'parsed' }),
        validateResponse: jest.fn().mockReturnValue(true),
      };

      const result = parser.parseAndValidate(mockAdapter, 'raw-response');

      expect(mockAdapter.parseResponse).toHaveBeenCalledWith('raw-response');
      expect(mockAdapter.validateResponse).toHaveBeenCalledWith({ data: 'parsed' });
      expect(result).toEqual({ parsed: { data: 'parsed' }, isValid: true });
    });

    it('should return isValid false if validation fails', () => {
      const mockAdapter: any = {
        parseResponse: jest.fn().mockReturnValue({ data: 'parsed' }),
        validateResponse: jest.fn().mockReturnValue(false),
      };

      const result = parser.parseAndValidate(mockAdapter, 'raw-response');

      expect(result.isValid).toBe(false);
    });
  });
});
