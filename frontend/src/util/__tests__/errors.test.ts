import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import { formatError } from '../../util/errors';

describe('formatError', () => {
  it('returns strings verbatim', () => {
    expect(formatError('simple message')).toBe('simple message');
  });

  it('formats numeric errors', () => {
    expect(formatError(404)).toBe('Error code: 404');
  });

  it('formats Axios errors with HTTP details and payload', () => {
    const axiosErr = new AxiosError(
      'Request failed',
      'ERR_BAD_RESPONSE',
      undefined,
      undefined,
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {},
        config: {},
        data: { message: 'Down for maintenance' }
      }
    );

    const message = formatError(axiosErr);
    expect(message).toContain('AxiosError');
    expect(message).toContain('HTTP 503 Service Unavailable');
    expect(message).toContain('Details:');
    expect(message).toContain('Down for maintenance');
  });

  it('includes stack and cause for generic errors', () => {
    const error = new Error('Boom', { cause: { info: 'context' } });
    const message = formatError(error);
    expect(message).toContain('Error: Boom');
    expect(message).toContain('Cause:');
    expect(message).toContain('context');
  });
});