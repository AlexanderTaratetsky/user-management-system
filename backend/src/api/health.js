export function mountHealth(app, promClient, enableMetrics) {
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  if (enableMetrics) {
    app.get('/metrics', async (_req, res) => {
      res.set('Content-Type', promClient.register.contentType);
      res.end(await promClient.register.metrics());
    });
  }
}
