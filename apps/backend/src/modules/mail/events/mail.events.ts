export class EmailReceivedEvent {
  constructor(
    public readonly messageId: string,
    public readonly subject: string,
  ) {}
}

export class EmailDuplicateDetectedEvent {
  constructor(public readonly messageId: string) {}
}

export class EmailProcessingFailedEvent {
  constructor(
    public readonly emailId: string,
    public readonly error: string,
  ) {}
}

export class EmailQueuedEvent {
  constructor(public readonly emailId: string) {}
}
