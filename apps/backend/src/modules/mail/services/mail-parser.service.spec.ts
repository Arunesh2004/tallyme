import { Test, TestingModule } from '@nestjs/testing';
import { MailParserService } from './mail-parser.service';
import { LoggerService } from '../../../core/logger/logger.service';
import { EmailParsingException } from '../exceptions/mail.exceptions';

describe('MailParserService', () => {
  let service: MailParserService;

  const mockLogger = {
    debug: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailParserService,
        { provide: LoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<MailParserService>(MailParserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parse', () => {
    it('should parse a valid email with all fields', async () => {
      const rawEmail = {
        messageId: 'msg-001',
        from: 'sender@example.com',
        to: 'billing@tallyme.com',
        subject: 'Payment Receipt',
        text: 'Payment of INR 1500 received',
        html: '<p>Payment received</p>',
      };

      const result = await service.parse(rawEmail);

      expect(result).toMatchObject({
        messageId: 'msg-001',
        sender: 'sender@example.com',
        receiver: 'billing@tallyme.com',
        subject: 'Payment Receipt',
        plainText: 'Payment of INR 1500 received',
        htmlText: '<p>Payment received</p>',
        attachments: [],
      });
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should use defaults when optional fields are missing', async () => {
      const rawEmail = {
        from: 'noreply@razorpay.com',
        // no messageId, to, subject, text, html
      };

      const result = await service.parse(rawEmail);

      expect(result.sender).toBe('noreply@razorpay.com');
      expect(result.receiver).toBe('billing@tallyme.com');
      expect(result.subject).toBe('No Subject');
      expect(result.plainText).toBe('');
      expect(result.htmlText).toBe('');
      expect(result.messageId).toMatch(/^msg_\d+$/);
    });

    it('should throw EmailParsingException when email is missing sender', async () => {
      const rawEmail = {
        messageId: 'msg-002',
        subject: 'No Sender',
        // no 'from' field
      };

      await expect(service.parse(rawEmail)).rejects.toThrow(EmailParsingException);
      await expect(service.parse(rawEmail)).rejects.toThrow(
        'Failed to parse email: Invalid email format',
      );
    });

    it('should throw EmailParsingException for null raw content', async () => {
      await expect(service.parse(null as any)).rejects.toThrow(EmailParsingException);
    });

    it('should call logger debug on successful parse', async () => {
      const rawEmail = { from: 'test@test.com' };
      await service.parse(rawEmail);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Parsing raw email content',
        'MailParserService',
      );
    });
  });
});
