/**
 * Sentry Error Tracking Setup (optional)
 * Only loads @sentry/node if SENTRY_DSN is set and the package is installed.
 */

let Sentry = null;

export async function initSentry() {
  if (!process.env.SENTRY_DSN) {
    console.log('⚠️ SENTRY_DSN not configured, error tracking disabled');
    return;
  }

  try {
    Sentry = await import('@sentry/node');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 1.0,
    });
    console.log('✅ Sentry initialized for error tracking');
  } catch (err) {
    console.warn('⚠️ Sentry package not installed, error tracking disabled:', err.message);
    Sentry = null;
  }
}

export function captureException(error, context = {}) {
  if (Sentry) {
    Sentry.captureException(error, { extra: context });
  }
  console.error('❌ Error:', error.message, context);
}

export function captureMessage(message, level = 'info') {
  if (Sentry) {
    Sentry.captureMessage(message, level);
  }
}
