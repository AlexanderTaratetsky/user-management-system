export function notFound(_req, res, _next) {
  res.status(404).json({ message: 'Not Found', reason: 'ROUTE_NOT_FOUND', status: 404 });
}

export function errorHandler(err, _req, res, _next) {
  const status = typeof err?.status === 'number' ? err.status : 500;

  if (status >= 500) {
    console.error('Unhandled error', err);
  }

  const payload = {
    message: err?.message || 'Unexpected error',
    name: err?.name || 'Error',
    reason: err?.reason || err?.code || (status >= 500 ? 'UNHANDLED_EXCEPTION' : undefined),
    status,
    stack: err?.stack,
    details: err?.details ?? err?.errors ?? undefined
  };

  if (!payload.reason) {
    delete payload.reason;
  }
  if (!payload.stack) {
    delete payload.stack;
  }
  if (!payload.details) {
    delete payload.details;
  }

  res.status(status).json(payload);
}