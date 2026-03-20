// ---------------------------------------------------------------------------
// Base error
// ---------------------------------------------------------------------------

export class BharatMCPError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, code: string, retryable = false) {
    super(message);
    this.name = 'BharatMCPError';
    this.code = code;
    this.retryable = retryable;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ---------------------------------------------------------------------------
// Upstream errors
// ---------------------------------------------------------------------------

export class UpstreamError extends BharatMCPError {
  readonly adapter: string;
  readonly statusCode?: number;

  constructor(message: string, adapter: string, statusCode?: number, retryable = false) {
    super(message, 'UPSTREAM_ERROR', retryable);
    this.name = 'UpstreamError';
    this.adapter = adapter;
    this.statusCode = statusCode;
  }
}

export class TimeoutError extends UpstreamError {
  readonly timeoutMs: number;

  constructor(adapter: string, timeoutMs: number) {
    super(
      `Request to adapter "${adapter}" timed out after ${timeoutMs}ms`,
      adapter,
      undefined,
      false,
    );
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

export class RateLimitError extends UpstreamError {
  readonly retryAfterMs?: number;

  constructor(adapter: string, retryAfterMs?: number) {
    super(
      `Rate limit exceeded for adapter "${adapter}"`,
      adapter,
      429,
      true, // retryable
    );
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

export class CaptchaBlockedError extends UpstreamError {
  constructor(adapter: string) {
    super(`Adapter "${adapter}" is blocking requests with a CAPTCHA`, adapter, 403, false);
    this.name = 'CaptchaBlockedError';
  }
}

export class MalformedResponseError extends UpstreamError {
  readonly detail: string;

  constructor(adapter: string, detail: string) {
    super(
      `Malformed response from adapter "${adapter}": ${detail}`,
      adapter,
      undefined,
      false,
    );
    this.name = 'MalformedResponseError';
    this.detail = detail;
  }
}

export class AuthError extends UpstreamError {
  constructor(adapter: string) {
    super(
      `Authentication failed for adapter "${adapter}". Check your SANDBOX_API_KEY environment variable.`,
      adapter,
      401,
      true, // may become valid after key refresh
    );
    this.name = 'AuthError';
  }
}

// ---------------------------------------------------------------------------
// Validation error
// ---------------------------------------------------------------------------

export class ValidationError extends BharatMCPError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', false);
    this.name = 'ValidationError';
  }
}

// ---------------------------------------------------------------------------
// Entity not found
// ---------------------------------------------------------------------------

export class EntityNotFoundError extends BharatMCPError {
  readonly entityType: string;
  readonly identifier: string;

  constructor(entityType: string, identifier: string) {
    super(`${entityType} not found: ${identifier}`, 'ENTITY_NOT_FOUND', false);
    this.name = 'EntityNotFoundError';
    this.entityType = entityType;
    this.identifier = identifier;
  }
}

// ---------------------------------------------------------------------------
// Partial data error
// ---------------------------------------------------------------------------

export class PartialDataError extends BharatMCPError {
  readonly availableFields: string[];
  readonly missingFields: string[];

  constructor(message: string, availableFields: string[], missingFields: string[]) {
    super(message, 'PARTIAL_DATA', false);
    this.name = 'PartialDataError';
    this.availableFields = availableFields;
    this.missingFields = missingFields;
  }
}

// ---------------------------------------------------------------------------
// Batch error
// ---------------------------------------------------------------------------

export class BatchError extends BharatMCPError {
  readonly results: unknown[];
  readonly errors: BharatMCPError[];
  readonly totalItems: number;

  constructor(results: unknown[], errors: BharatMCPError[], totalItems: number) {
    super(
      `Batch operation completed with ${errors.length} error(s) out of ${totalItems} item(s)`,
      'BATCH_ERROR',
      false,
    );
    this.name = 'BatchError';
    this.results = results;
    this.errors = errors;
    this.totalItems = totalItems;
  }
}
