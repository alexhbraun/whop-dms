export async function register() {
  await import("./sentry.server.config");
  await import("./sentry.client.config");
}
