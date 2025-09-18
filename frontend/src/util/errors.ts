import axios from 'axios';

function formatDetails(details: unknown): string | undefined {
  if (!details) return undefined;
  if (typeof details === 'string') return details;
  try {
    return JSON.stringify(details, null, 2);
  } catch (error) {
    return 'Unserializable details: ' + String(error);
  }
}

export function formatError(error: unknown, fallback = 'Request failed'): string {
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'number') {
    return `Error code: ${error}`;
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const statusText = error.response?.statusText;
    const parts = [
      error.name || 'AxiosError',
      error.code ? `Code: ${error.code}` : null,
      status ? `HTTP ${status}${statusText ? ' ' + statusText : ''}` : null,
      error.message ? `Message: ${error.message}` : null,
      error.response?.data ? `Details: ${formatDetails(error.response.data)}` : null,
      error.stack ? `Stack: ${error.stack}` : null
    ];
    return parts.filter(Boolean).join(' | ') || fallback;
  }
  if (error instanceof Error) {
    const cause = (error as Error & { cause?: unknown }).cause;
    const parts = [
      `${error.name}: ${error.message}`,
      cause ? `Cause: ${formatDetails(cause)}` : null,
      error.stack ? `Stack: ${error.stack}` : null
    ];
    return parts.filter(Boolean).join(' | ');
  }
  try {
    return `Unknown error: ${JSON.stringify(error)}`;
  } catch {
    return fallback;
  }
}

export function normalizeError(error: unknown, fallback = 'Operation failed'): { message: string; raw: unknown } {
  return { message: formatError(error, fallback), raw: error };
}