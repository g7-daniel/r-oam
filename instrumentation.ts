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

    console.log('');
    console.log('========================================');
    console.log('  Validating environment variables...');
    console.log('========================================');

    try {
      validateServerEnv();
      console.log('  All required env vars are configured.');
      console.log('========================================');
      console.log('');
    } catch (error) {
      // In development, we log and continue
      // In production, the error will be thrown
      if (process.env.NODE_ENV !== 'production') {
        console.warn('');
        console.warn('  WARNING: Some env vars are missing.');
        console.warn('  The app will run but some features may not work.');
        console.warn('========================================');
        console.warn('');
      }
    }
  }
}
