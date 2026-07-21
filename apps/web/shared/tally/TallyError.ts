export class TallyError extends Error {
  public readonly code: string;

  constructor(message: string, code: string = 'TALLY_GENERIC_ERROR') {
    super(message);
    this.name = 'TallyError';
    this.code = code;
  }
}

export class ConnectionError extends TallyError {
  constructor(message: string = 'Failed to connect to Tally Prime.') {
    super(message, 'TALLY_CONNECTION_ERROR');
  }
}

export class TimeoutError extends TallyError {
  constructor(message: string = 'Request to Tally Prime timed out.') {
    super(message, 'TALLY_TIMEOUT_ERROR');
  }
}

export class XmlParseError extends TallyError {
  constructor(message: string = 'Failed to parse Tally Prime XML response.') {
    super(message, 'TALLY_XML_PARSE_ERROR');
  }
}

export class AuthenticationError extends TallyError {
  constructor(message: string = 'Authentication failed with Tally Prime.') {
    super(message, 'TALLY_AUTHENTICATION_ERROR');
  }
}

export class CompanyNotOpenError extends TallyError {
  constructor(message: string = 'The requested company is not open in Tally Prime.') {
    super(message, 'TALLY_COMPANY_NOT_OPEN_ERROR');
  }
}

export class TallyUnavailableError extends TallyError {
  constructor(message: string = 'Tally Prime service is unavailable.') {
    super(message, 'TALLY_UNAVAILABLE_ERROR');
  }
}
