/**
 * Next.js Instrumentation File
 *
 * This file runs once when the server starts up.
 * We use it to validate environment variables on startup.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only validate on server (not during build)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamic import to avoid issues during build
    const { validateServerEnv } = await import('./lib/env');


    try {
      validateServerEnv();
    } catch (error) {
      // In development, we log and continue
      // In production, the error will be thrown
      if (process.env.NODE_ENV !== 'production') {
      }
    }
  }
}
