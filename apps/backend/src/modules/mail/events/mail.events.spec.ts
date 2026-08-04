import {
  EmailReceivedEvent,
  EmailDuplicateDetectedEvent,
  EmailProcessingFailedEvent,
  EmailQueuedEvent,
} from './mail.events';

describe('Mail Events', () => {
  it('should instantiate EmailReceivedEvent', () => {
    const e = new EmailReceivedEvent('msg-1', 'Fee Receipt');
    expect(e.messageId).toBe('msg-1');
    expect(e.subject).toBe('Fee Receipt');
  });

  it('should instantiate EmailDuplicateDetectedEvent', () => {
    const e = new EmailDuplicateDetectedEvent('msg-1');
    expect(e.messageId).toBe('msg-1');
  });

  it('should instantiate EmailProcessingFailedEvent', () => {
    const e = new EmailProcessingFailedEvent('email-1', 'Parse error');
    expect(e.emailId).toBe('email-1');
    expect(e.error).toBe('Parse error');
  });

  it('should instantiate EmailQueuedEvent', () => {
    const e = new EmailQueuedEvent('email-1');
    expect(e.emailId).toBe('email-1');
  });
});
