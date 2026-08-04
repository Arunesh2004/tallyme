import { HttpStatus } from '@nestjs/common';
import {
  MailDomainException,
  DuplicateEmailException,
  EmailParsingException,
} from './mail.exceptions';

describe('Mail Exceptions', () => {
  describe('MailDomainException', () => {
    it('should create with message and default status', () => {
      const ex = new MailDomainException('Base mail error');
      expect(ex.message).toBe('Base mail error');
      expect(ex.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should create with custom status', () => {
      const ex = new MailDomainException('Not found', HttpStatus.NOT_FOUND);
      expect(ex.getStatus()).toBe(HttpStatus.NOT_FOUND);
    });

    it('should accept a cause error', () => {
      const cause = new Error('original');
      const ex = new MailDomainException('Wrapped', HttpStatus.BAD_REQUEST, cause);
      expect(ex).toBeInstanceOf(MailDomainException);
    });
  });

  describe('DuplicateEmailException', () => {
    it('should create with CONFLICT status and proper message', () => {
      const ex = new DuplicateEmailException('msg-123');
      expect(ex.message).toBe(
        'Email with Message-ID msg-123 is already processed',
      );
      expect(ex.getStatus()).toBe(HttpStatus.CONFLICT);
    });

    it('should be an instance of MailDomainException', () => {
      const ex = new DuplicateEmailException('msg-456');
      expect(ex).toBeInstanceOf(MailDomainException);
    });
  });

  describe('EmailParsingException', () => {
    it('should create with UNPROCESSABLE_ENTITY status and prefixed message', () => {
      const ex = new EmailParsingException('Invalid headers');
      expect(ex.message).toBe('Failed to parse email: Invalid headers');
      expect(ex.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    });

    it('should accept a cause error', () => {
      const cause = new Error('parse failure');
      const ex = new EmailParsingException('Malformed', cause);
      expect(ex).toBeInstanceOf(MailDomainException);
    });

    it('should be an instance of MailDomainException', () => {
      const ex = new EmailParsingException('test');
      expect(ex).toBeInstanceOf(MailDomainException);
    });
  });
});
